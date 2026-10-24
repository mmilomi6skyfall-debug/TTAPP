import { Controller, Get, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

@Controller()
class E2EProbeController {
  @Get('/_test/ready')
  ready() {
    return { status: 'ok' };
  }
}

describe('isolated E2E harness', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [E2EProbeController],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('serves an HTTP request through Nest and Supertest', async () => {
    await request(app.getHttpServer())
      .get('/_test/ready')
      .expect(200)
      .expect({ status: 'ok' });
  });
});
