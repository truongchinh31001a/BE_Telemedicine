import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { MedicalRecordsService } from './medical-records.service';
import { pickAlias } from './common/alias.util';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('medical-records')
export class MedicalRecordsController {
  constructor(private readonly medicalRecordsService: MedicalRecordsService) {}

  @Roles('admin', 'doctor', 'nurse')
  @Post()
  create(@Body() payload: Record<string, unknown>) {
    return this.medicalRecordsService.createMedicalRecord(payload);
  }

  @Roles('admin', 'doctor', 'nurse')
  @Put(':id')
  update(@Param('id') id: string, @Body() payload: Record<string, unknown>) {
    return this.medicalRecordsService.updateMedicalRecord(id, payload);
  }

  @Roles('admin', 'doctor', 'nurse', 'patient')
  @Get('records/:id')
  getById(@Param('id') id: string) {
    return this.medicalRecordsService.getRecordById(id);
  }

  @Roles('admin', 'doctor', 'nurse', 'patient')
  @Get('patient/prescriptions')
  getPatientPrescriptions(@Query() query: Record<string, unknown>) {
    const patientId = pickAlias<string>(query, ['patientId', 'patient_id', 'PatientID']) ?? '';
    return this.medicalRecordsService.getPatientPrescriptions(patientId);
  }

  @Roles('admin', 'doctor', 'nurse', 'patient')
  @Get('patient/:id')
  getByPatient(@Param('id') id: string) {
    return this.medicalRecordsService.getRecordsByPatientId(id);
  }

  @Roles('admin', 'doctor', 'nurse', 'patient')
  @Get('patient/history/:id')
  getPatientHistory(@Param('id') id: string) {
    return this.medicalRecordsService.getPatientHistory(id);
  }

  @Roles('admin', 'doctor', 'nurse')
  @Put('history/:type/:id')
  updateHistory(
    @Param('type') type: string,
    @Param('id') id: string,
    @Body() payload: Record<string, unknown>,
  ) {
    return this.medicalRecordsService.updateHistory(type, id, payload);
  }

  @Roles('admin', 'doctor', 'nurse')
  @Post('vitals')
  createVitals(@Body() payload: Record<string, unknown>) {
    return this.medicalRecordsService.createVitals(payload);
  }

  @Roles('admin', 'doctor', 'nurse', 'patient')
  @Get('patient/vitals/:id')
  getPatientVitals(@Param('id') id: string) {
    return this.medicalRecordsService.getPatientVitals(id);
  }

  @Roles('admin', 'doctor', 'nurse')
  @Put('vitals/edit/:id')
  updateVitals(@Param('id') id: string, @Body() payload: Record<string, unknown>) {
    return this.medicalRecordsService.updateVitals(id, payload);
  }
}

@Controller()
export class ClinicalTestsController {
  constructor(private readonly medicalRecordsService: MedicalRecordsService) {}

  @Roles('admin', 'doctor', 'nurse', 'patient')
  @Get('lab-tests/:id')
  getLabTests(@Param('id') id: string) {
    return this.medicalRecordsService.getLabTestsByRecordId(id);
  }

  @Roles('admin', 'doctor', 'nurse', 'patient')
  @Get('imaging-tests/:id')
  getImagingTests(@Param('id') id: string) {
    return this.medicalRecordsService.getImagingTestsByRecordId(id);
  }
}
