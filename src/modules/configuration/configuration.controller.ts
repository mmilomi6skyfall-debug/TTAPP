import { Body, Controller, Get, Put } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { AuthenticatedUser } from '../auth/jwt-payload.interface';
import { UpdateRequiredDocumentsDto } from './dto/update-required-documents.dto';
import { ConfigurationService } from './configuration.service';

@Controller('configuration')
@RequirePermissions('configuration.manage')
export class ConfigurationController {
  constructor(private readonly configuration: ConfigurationService) {}

  @Get('onboarding/required-documents')
  getRequiredDocuments(@CurrentUser() user: AuthenticatedUser) {
    return this.configuration.getRequiredDocuments(user);
  }

  @Put('onboarding/required-documents')
  updateRequiredDocuments(@Body() dto: UpdateRequiredDocumentsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.configuration.updateRequiredDocuments(dto, user);
  }
}
