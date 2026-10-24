import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { Trip } from '../trips/entities/trip.entity';
import { TripEvent } from '../trips/entities/trip-event.entity';
import { TripAssignmentOffer } from '../trips/entities/trip-assignment-offer.entity';
import { DriverProfile } from '../drivers/entities/driver-profile.entity';
import { TripStatus } from '../../common/enums';
import { assertTransition, clamp } from '../trips/trip-state.util';
import { ManualAssignDto } from './dto/manual-assign.dto';
import { AuthenticatedUser } from '../auth/jwt-payload.interface';
import { AuditService } from '../audit/audit.service';

interface CandidateRow {
  driver_id: string;
  vehicle_id: string;
  average_rating: string;
  available_since: string | null;
  distance_meters: string;
}

export interface ScoredCandidate {
  driverId: string;
  vehicleId: string;
  score: number;
  distanceMeters: number;
  etaMinutes: number;
}

const ASSIGNABLE_STATES = [TripStatus.QUOTED, TripStatus.SEARCHING_DRIVER];

@Injectable()
export class DispatchService {
  private readonly logger = new Logger(DispatchService.name);

  constructor(
    @InjectRepository(Trip) private readonly trips: Repository<Trip>,
    @InjectRepository(TripEvent) private readonly tripEvents: Repository<TripEvent>,
    @InjectRepository(TripAssignmentOffer)
    private readonly offers: Repository<TripAssignmentOffer>,
    @InjectRepository(DriverProfile) private readonly drivers: Repository<DriverProfile>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
  ) {}

  // Disparado desde TripsService.create() via evento — evita la
  // dependencia circular TripsModule <-> DispatchModule.
  @OnEvent('trip.quoted')
  async handleTripQuoted(payload: { tripId: string }): Promise<void> {
    try {
      await this.startDispatch(payload.tripId);
    } catch (err) {
      this.logger.error(`Fallo el despacho automatico del viaje ${payload.tripId}`, err as Error);
    }
  }

  // ----------------------------------------------------------------
  // Ticket 7.7.a — filtro de elegibilidad
  // ----------------------------------------------------------------
  private async getEligibleCandidates(trip: Trip, maxRadiusMeters: number): Promise<CandidateRow[]> {
    const organizationId = trip.organization?.id;
    if (!organizationId) throw new ForbiddenException('El viaje no tiene una organización válida');

    return this.dataSource.query(
      `SELECT
         dp.user_id AS driver_id,
         dva.vehicle_id AS vehicle_id,
         dp.average_rating,
         dp.available_since,
         ST_Distance(
           dl.position,
           ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
         ) AS distance_meters
       FROM driver_profiles dp
       JOIN users u ON u.id = dp.user_id AND u.organization_id = $5
       JOIN driver_vehicle_assignments dva ON dva.driver_id = dp.user_id AND dva.active = true
       JOIN vehicles v ON v.id = dva.vehicle_id
       JOIN driver_locations dl ON dl.driver_id = dp.user_id
       WHERE dp.status = 'AVAILABLE'
         AND v.organization_id = $5
         AND v.status = 'ACTIVE'
         AND dl.recorded_at > now() - interval '2 minutes'
         AND ST_DWithin(
           dl.position,
           ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
           $3
         )
         AND dp.user_id NOT IN (
           SELECT driver_id FROM trip_assignment_offers WHERE trip_id = $4
         )`,
      [trip.origin.coordinates[0], trip.origin.coordinates[1], maxRadiusMeters, trip.id, organizationId],
    );
  }

  // ----------------------------------------------------------------
  // Ticket 7.7.b — score ponderado
  // ----------------------------------------------------------------
  private async scoreCandidate(
    row: CandidateRow,
    organizationId: string,
    config: { weights: Record<string, number>; maxRadiusMeters: number; maxEtaMinutes: number; idleSaturationMinutes: number },
  ): Promise<ScoredCandidate> {
    const distanceMeters = Number(row.distance_meters);
    const proximityScore = clamp(1 - distanceMeters / config.maxRadiusMeters, 0, 1);

    const AVERAGE_SPEED_KMH = 25;
    const etaMinutes = (distanceMeters / 1000 / AVERAGE_SPEED_KMH) * 60;
    const etaScore = clamp(1 - etaMinutes / config.maxEtaMinutes, 0, 1);

    const minutesSinceAvailable = row.available_since
      ? (Date.now() - new Date(row.available_since).getTime()) / 60000
      : 0;
    const idleScore = clamp(minutesSinceAvailable / config.idleSaturationMinutes, 0, 1);

    const ratingScore = clamp((Number(row.average_rating) - 1) / 4, 0, 1);

    const cancelRows = await this.dataSource.query(
      `SELECT count(*)::int AS n FROM trips
       WHERE driver_id = $1 AND organization_id = $2
         AND status = 'CANCELLED_BY_DRIVER'
         AND requested_at > now() - interval '24 hours'`,
      [row.driver_id, organizationId],
    );
    const cancellationPenalty = clamp(Number(cancelRows[0].n) / 5, 0, 1);

    const w = config.weights;
    const score =
      w.proximity * proximityScore +
      w.eta * etaScore +
      w.idle_time * idleScore +
      w.rating * ratingScore -
      w.cancellations * cancellationPenalty;

    return {
      driverId: row.driver_id,
      vehicleId: row.vehicle_id,
      score: Math.round(score * 10000) / 10000,
      distanceMeters: Math.round(distanceMeters),
      etaMinutes: Math.round(etaMinutes),
    };
  }

  private async readDispatchConfig(organizationId: string) {
    const rows = await this.dataSource.query(
      `SELECT key, value FROM configuration WHERE organization_id = $1 AND key LIKE 'dispatch.%'`,
      [organizationId],
    );
    const map: Record<string, any> = {};
    for (const r of rows) map[r.key] = r.value;

    return {
      weights: map['dispatch.weights'] ?? {
        proximity: 0.4,
        eta: 0.25,
        idle_time: 0.2,
        rating: 0.1,
        cancellations: 0.05,
      },
      maxRadiusMeters: Number(map['dispatch.max_radius_meters'] ?? 5000),
      maxEtaMinutes: Number(map['dispatch.max_eta_minutes'] ?? 15),
      idleSaturationMinutes: Number(map['dispatch.idle_saturation_minutes'] ?? 30),
    };
  }

  async getRankedCandidates(tripId: string, organizationId: string): Promise<ScoredCandidate[]> {
    const trip = await this.trips.findOne({
      where: { id: tripId },
      relations: ['organization'],
    });
    if (!trip) throw new NotFoundException('Viaje no encontrado');
    if (trip.organization?.id !== organizationId) {
      throw new ForbiddenException('El viaje no pertenece a tu organización');
    }

    const config = await this.readDispatchConfig(organizationId);
    const rows = await this.getEligibleCandidates(trip, config.maxRadiusMeters);
    const scored = await Promise.all(rows.map((r) => this.scoreCandidate(r, organizationId, config)));
    return scored.sort((a, b) => b.score - a.score);
  }

  // ----------------------------------------------------------------
  // Ticket 7.7.c — disparar/reintentar despacho automatico
  // ----------------------------------------------------------------
  async startDispatch(tripId: string, organizationId?: string): Promise<Trip> {
    const trip = await this.trips.findOne({ where: { id: tripId }, relations: ['organization'] });
    if (!trip) throw new NotFoundException('Viaje no encontrado');
    if (organizationId && trip.organization?.id !== organizationId) {
      throw new ForbiddenException('El viaje no pertenece a tu organización');
    }
    assertTransition(trip, ASSIGNABLE_STATES);

    if (trip.serviceCategory === 'FORANEO') {
      throw new ConflictException('FORANEO no admite despacho automatico — usar /dispatch/manual-assign');
    }

    const candidates = await this.getRankedCandidates(tripId, trip.organization.id);
    if (candidates.length === 0) return trip;

    const top = candidates[0];
    // La elegibilidad puede cambiar después del ranking; revalidar tenant,
    // vehículo activo y disponibilidad antes de crear la oferta.
    const eligible = await this.dataSource.query(
      `SELECT dp.user_id
       FROM driver_profiles dp
       JOIN users u ON u.id = dp.user_id AND u.organization_id = $3
       JOIN driver_vehicle_assignments a ON a.driver_id = dp.user_id AND a.vehicle_id = $2 AND a.active = true
       JOIN vehicles v ON v.id = a.vehicle_id AND v.organization_id = $3 AND v.status = 'ACTIVE'
       WHERE dp.user_id = $1 AND dp.status = 'AVAILABLE'
       LIMIT 1`,
      [top.driverId, top.vehicleId, trip.organization.id],
    );
    if (!eligible.length) return trip;

    const priorOffer = await this.offers.findOne({
      where: { trip: { id: tripId }, driver: { userId: top.driverId } },
    });
    if (priorOffer) return trip;

    const fromStatus = trip.status;
    trip.status = TripStatus.SEARCHING_DRIVER;
    await this.trips.save(trip);

    await this.offers.save(
      this.offers.create({
        trip: { id: tripId } as any,
        driver: { userId: top.driverId } as any,
        score: top.score,
        manual: false,
      }),
    );

    await this.tripEvents.save(
      this.tripEvents.create({
        trip: { id: tripId } as any,
        fromStatus,
        toStatus: trip.status,
        actorUser: null,
        reason: `oferta enviada a conductor ${top.driverId} (score ${top.score})`,
      }),
    );

    return trip;
  }

  // ----------------------------------------------------------------
  // Ticket 7.7.d — expiracion (llamado desde DispatchExpiryService)
  // ----------------------------------------------------------------
  async expireOffer(offerId: string): Promise<void> {
    const offer = await this.offers.findOne({ where: { id: offerId }, relations: ['trip'] });
    if (!offer || offer.respondedAt) return;

    offer.response = 'EXPIRED';
    offer.respondedAt = new Date();
    await this.offers.save(offer);

    await this.startDispatch(offer.trip.id);
  }

  // ----------------------------------------------------------------
  // Ticket 7.7.e — responder oferta (conductor)
  // ----------------------------------------------------------------
  async respondToOffer(
    offerId: string,
    response: 'ACCEPTED' | 'REJECTED',
    currentUser: AuthenticatedUser,
  ): Promise<Trip> {
    if (currentUser.role !== 'DRIVER' || !currentUser.permissions.includes('dispatch.offers.view')) {
      throw new ForbiddenException('Requiere un conductor autorizado con dispatch.offers.view');
    }

    const offer = await this.offers.findOne({
      where: { id: offerId },
      relations: ['trip', 'trip.organization', 'driver', 'driver.user', 'driver.user.organization'],
    });
    if (!offer) throw new NotFoundException('Oferta no encontrada');
    if (offer.driver.userId !== currentUser.id) {
      throw new ForbiddenException('Esta oferta no es tuya');
    }
    if (offer.trip.organization?.id !== currentUser.organizationId ||
        offer.driver.user?.organization?.id !== currentUser.organizationId) {
      throw new ForbiddenException('La oferta, el viaje y el conductor deben pertenecer a tu organización');
    }
    if (offer.respondedAt) {
      throw new ConflictException('Esta oferta ya fue respondida o expiro');
    }

    const trip = offer.trip;
    assertTransition(trip, ASSIGNABLE_STATES);

    let vehicleId: string | null = null;
    if (response === 'ACCEPTED') {
      if (offer.driver.status !== 'AVAILABLE') {
        throw new ConflictException('El conductor ya no esta disponible');
      }
      const assignmentRows = await this.dataSource.query(
        `SELECT v.id AS vehicle_id
         FROM driver_vehicle_assignments a
         JOIN vehicles v ON v.id = a.vehicle_id
         WHERE a.driver_id = $1 AND a.active = true
           AND v.organization_id = $2 AND v.status = 'ACTIVE'
         LIMIT 1`,
        [offer.driver.userId, currentUser.organizationId],
      );
      if (assignmentRows.length === 0) {
        throw new ConflictException('El conductor no tiene un vehiculo activo de su organización');
      }
      vehicleId = assignmentRows[0].vehicle_id;
    }

    // Toda validación de actor, organización, estado y unidad ocurre antes
    // de persistir la respuesta de oferta.
    const fromStatus = trip.status;
    if (response === 'ACCEPTED') {
      trip.driver = { userId: offer.driver.userId } as any;
      trip.vehicle = { id: vehicleId } as any;
      trip.status = TripStatus.DRIVER_ASSIGNED;
      await this.trips.save(trip);
      await this.drivers.update(offer.driver.userId, { status: 'BUSY' as any });
      await this.tripEvents.save(
        this.tripEvents.create({
          trip: { id: trip.id } as any,
          fromStatus,
          toStatus: trip.status,
          actorUser: { id: currentUser.id } as any,
        }),
      );
    }

    offer.response = response;
    offer.respondedAt = new Date();
    await this.offers.save(offer);

    if (response === 'ACCEPTED') return trip;
    return this.startDispatch(trip.id, currentUser.organizationId);
  }

  async getPendingOffersForDriver(driverId: string, organizationId: string): Promise<TripAssignmentOffer[]> {
    const offers = await this.offers.find({
      where: { driver: { userId: driverId }, respondedAt: IsNull() },
      relations: ['trip', 'trip.organization'],
      order: { offeredAt: 'DESC' },
    });
    return offers.filter((offer) => offer.trip?.organization?.id === organizationId);
  }

  // ----------------------------------------------------------------
  // Ticket 7.11 — asignacion manual (operador)
  // ----------------------------------------------------------------
  async manualAssign(dto: ManualAssignDto, currentUser: AuthenticatedUser): Promise<Trip> {
    if (!currentUser.permissions.includes('dispatch.manual_assign')) {
      throw new ForbiddenException('Requiere el permiso dispatch.manual_assign');
    }

    const trip = await this.trips.findOne({
      where: { id: dto.tripId },
      relations: ['organization'],
    });
    if (!trip) throw new NotFoundException('Viaje no encontrado');
    if (trip.organization?.id !== currentUser.organizationId) {
      throw new ForbiddenException('El viaje no pertenece a tu organización');
    }
    assertTransition(trip, ASSIGNABLE_STATES);

    const driver = await this.drivers.findOne({
      where: { userId: dto.driverId },
      relations: ['user', 'user.organization'],
    });
    if (!driver) throw new NotFoundException('Conductor no encontrado');
    if (driver.user?.organization?.id !== currentUser.organizationId) {
      throw new ForbiddenException('El conductor no pertenece a tu organización');
    }
    if (driver.status !== 'AVAILABLE') {
      throw new ConflictException('El conductor no esta disponible');
    }

    const assignmentRows = await this.dataSource.query(
      `SELECT v.id AS vehicle_id
       FROM driver_vehicle_assignments a
       JOIN vehicles v ON v.id = a.vehicle_id
       WHERE a.driver_id = $1 AND a.active = true
         AND v.organization_id = $2 AND v.status = 'ACTIVE'
       LIMIT 1`,
      [dto.driverId, currentUser.organizationId],
    );
    if (assignmentRows.length === 0) {
      throw new ConflictException('El conductor no tiene un vehiculo activo de su organización');
    }

    const fromStatus = trip.status;
    trip.driver = { userId: dto.driverId } as any;
    trip.vehicle = { id: assignmentRows[0].vehicle_id } as any;
    trip.status = TripStatus.DRIVER_ASSIGNED;
    await this.trips.save(trip);

    await this.offers.save(
      this.offers.create({
        trip: { id: trip.id } as any,
        driver: { userId: dto.driverId } as any,
        manual: true,
        assignedBy: { id: currentUser.id } as any,
        response: 'ACCEPTED',
        respondedAt: new Date(),
      }),
    );

    await this.drivers.update(dto.driverId, { status: 'BUSY' as any });

    await this.tripEvents.save(
      this.tripEvents.create({
        trip: { id: trip.id } as any,
        fromStatus,
        toStatus: trip.status,
        actorUser: { id: currentUser.id } as any,
        reason: dto.reason,
      }),
    );

    await this.auditService.record({
      actorUserId: currentUser.id,
      organizationId: currentUser.organizationId,
      action: 'dispatch.manual_assign',
      entity: 'trips',
      entityId: trip.id,
      newValue: { driverId: dto.driverId, vehicleId: assignmentRows[0].vehicle_id },
      reason: dto.reason,
    });

    return trip;
  }
}
