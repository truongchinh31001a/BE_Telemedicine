import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { setupSwagger } from './../src/bootstrap/swagger';

describe('API Build Checklist + Auth (e2e)', () => {
  let app: INestApplication<App>;
  let accessToken = '';

  let departmentId = '';
  let staffId = '';
  let patientId = '';
  let recordId = '';
  let drugId = '';

  const auth = () => ({ Authorization: `Bearer ${accessToken}` });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    setupSwagger(app);
    await app.init();

    const loginRes = await request(app.getHttpServer()).post('/auth/login').send({
      identifier: 'admin',
      password: 'Admin@123',
    });

    if (loginRes.status !== 201 || !loginRes.body.accessToken) {
      throw new Error('Login failed. Please run seed first: npm run seed');
    }
    accessToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api-docs-json (public)', async () => {
    const res = await request(app.getHttpServer()).get('/api-docs-json').expect(200);
    expect(res.body.openapi).toBeDefined();
  });

  it('Auth refresh + logout flow', async () => {
    const loginRes = await request(app.getHttpServer()).post('/auth/login').send({
      identifier: 'admin',
      password: 'Admin@123',
    });

    expect(loginRes.status).toBe(201);
    expect(loginRes.body.accessToken).toBeDefined();
    expect(loginRes.body.refreshToken).toBeDefined();

    const refreshRes = await request(app.getHttpServer()).post('/auth/refresh').send({
      refreshToken: loginRes.body.refreshToken,
    });

    expect(refreshRes.status).toBe(201);
    expect(refreshRes.body.accessToken).toBeDefined();
    expect(refreshRes.body.refreshToken).toBeDefined();

    await request(app.getHttpServer())
      .post('/auth/logout')
      .send({ refreshToken: refreshRes.body.refreshToken })
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: refreshRes.body.refreshToken })
      .expect(401);
  });

  it('GET /departments requires auth', async () => {
    await request(app.getHttpServer()).get('/departments').expect(401);
  });

  it('Master data flow', async () => {
    const departmentsRes = await request(app.getHttpServer())
      .get('/departments')
      .set(auth())
      .expect(200);
    expect(Array.isArray(departmentsRes.body)).toBe(true);
    expect(departmentsRes.body.length).toBeGreaterThan(0);
    departmentId = departmentsRes.body[0].departmentId;

    const unique = Date.now().toString();

    const staffCreateRes = await request(app.getHttpServer())
      .post('/staff')
      .set(auth())
      .send({
        username: `doctor_${unique}`,
        email: `doctor_${unique}@example.com`,
        password: 'Doctor@123',
        fullName: `Doctor ${unique}`,
        departmentId,
        position: 'Doctor',
      })
      .expect(201);

    staffId = staffCreateRes.body.staffId;

    await request(app.getHttpServer()).get('/staff').set(auth()).expect(200);
    await request(app.getHttpServer()).get(`/staff/${staffId}`).set(auth()).expect(200);

    const patientCreateRes = await request(app.getHttpServer())
      .post('/patients')
      .set(auth())
      .send({
        username: `patient_${unique}`,
        email: `patient_${unique}@example.com`,
        password: 'Patient@123',
        fullName: `Patient ${unique}`,
        patientCode: `BN_${unique}`,
        patientJob: 'Engineer',
      })
      .expect(201);

    patientId = patientCreateRes.body.patientId;

    await request(app.getHttpServer()).get('/patients').set(auth()).expect(200);
    await request(app.getHttpServer()).get(`/patients/${patientId}`).set(auth()).expect(200);

    const drugRes = await request(app.getHttpServer())
      .post('/drug')
      .set(auth())
      .send({
        drugName: `Drug ${unique}`,
        unit: 'vien',
        stock: 100,
      })
      .expect(201);
    drugId = drugRes.body.drugId;

    await request(app.getHttpServer()).get('/drug').set(auth()).expect(200);
  });

  it('Appointment + schedule endpoints', async () => {
    await request(app.getHttpServer())
      .post('/appointment/schedule')
      .set(auth())
      .send({
        staffId,
        workDate: '2026-02-26',
        startTime: '08:00',
        endTime: '09:00',
        room: 'P101',
      })
      .expect(201);

    await request(app.getHttpServer())
      .get('/appointment/available-slots')
      .set(auth())
      .query({ staffId, date: '2026-02-26' })
      .expect(200);

    const meRes = await request(app.getHttpServer())
      .get('/appointment/me')
      .set(auth())
      .query({ staffId })
      .expect(200);

    if (meRes.body.length > 0) {
      const firstAppointmentId = meRes.body[0].appointmentId;
      await request(app.getHttpServer())
        .patch(`/appointment/${firstAppointmentId}/cancel`)
        .set(auth())
        .expect(200);
    }
  });

  it('Medical record endpoints', async () => {
    const createRecordRes = await request(app.getHttpServer())
      .post('/medical-records')
      .set(auth())
      .send({
        patientId,
        staffId,
        diagnosis: 'J01',
        conclusion: 'Stable',
      })
      .expect(201);

    recordId = createRecordRes.body.recordId;

    await request(app.getHttpServer())
      .put(`/medical-records/${recordId}`)
      .set(auth())
      .send({ diagnosis: 'J02' })
      .expect(200);

    await request(app.getHttpServer())
      .get(`/medical-records/records/${recordId}`)
      .set(auth())
      .expect(200);
    await request(app.getHttpServer())
      .get(`/medical-records/patient/${patientId}`)
      .set(auth())
      .expect(200);

    const vitalRes = await request(app.getHttpServer())
      .post('/medical-records/vitals')
      .set(auth())
      .send({
        recordId,
        height: 170,
        weight: 65,
        temperature: 36.8,
        heartRate: 80,
        bloodPressure: '120/80',
        respiratoryRate: 18,
        oxygenSaturation: 98,
        note: '',
      })
      .expect(201);

    await request(app.getHttpServer())
      .put(`/medical-records/vitals/edit/${vitalRes.body.vitalsId}`)
      .set(auth())
      .send({ note: 'Updated' })
      .expect(200);

    await request(app.getHttpServer()).get(`/lab-tests/${recordId}`).set(auth()).expect(200);
    await request(app.getHttpServer()).get(`/imaging-tests/${recordId}`).set(auth()).expect(200);
  });

  it('Prescription endpoints', async () => {
    await request(app.getHttpServer())
      .post(`/prescriptions/${recordId}`)
      .set(auth())
      .send([
        {
          drugId,
          unit: 'vien',
          quantity: 10,
          timeOfDay: 'morning',
          mealTiming: 'after_meal',
          note: '',
        },
      ])
      .expect(201);

    await request(app.getHttpServer())
      .put(`/prescriptions/${recordId}`)
      .set(auth())
      .send({
        startDate: '2026-02-26T00:00:00Z',
        days: 5,
      })
      .expect(200);

    const prescriptionRes = await request(app.getHttpServer())
      .get(`/prescriptions/${recordId}`)
      .set(auth())
      .expect(200);

    const firstDetail = prescriptionRes.body.details[0];

    await request(app.getHttpServer())
      .put('/prescriptions/detail')
      .set(auth())
      .send({ detailId: firstDetail.detailId, note: 'Updated note' })
      .expect(200);

    await request(app.getHttpServer())
      .get(`/prescriptions/patient/${patientId}`)
      .set(auth())
      .expect(200);

    await request(app.getHttpServer())
      .get('/medical-records/patient/prescriptions')
      .set(auth())
      .query({ patientId })
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/prescriptions/detail/${firstDetail.detailId}`)
      .set(auth())
      .expect(200);
  });
});
