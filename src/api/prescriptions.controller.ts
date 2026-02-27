import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { PrescriptionsService } from './prescriptions.service';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('prescriptions')
export class PrescriptionsController {
  constructor(private readonly prescriptionsService: PrescriptionsService) {}

  @Roles('admin', 'doctor', 'nurse', 'patient')
  @Get(':id')
  getById(@Param('id') id: string) {
    return this.prescriptionsService.getByRecordId(id);
  }

  @Roles('admin', 'doctor', 'nurse')
  @Post(':recordId')
  createDetails(@Param('recordId') recordId: string, @Body() payload: unknown) {
    return this.prescriptionsService.createDetails(recordId, payload);
  }

  @Roles('admin', 'doctor', 'nurse')
  @Put('detail')
  updateDetail(@Body() payload: Record<string, unknown>) {
    return this.prescriptionsService.updateDetail(payload);
  }

  @Roles('admin', 'doctor', 'nurse')
  @Put(':recordId')
  updatePrescription(@Param('recordId') recordId: string, @Body() payload: Record<string, unknown>) {
    return this.prescriptionsService.updatePrescription(recordId, payload);
  }

  @Roles('admin', 'doctor', 'nurse')
  @Put(':type/:id')
  legacyUpdate(
    @Param('type') type: string,
    @Param('id') id: string,
    @Body() payload: Record<string, unknown>,
  ) {
    return this.prescriptionsService.legacyUpdate(type, id, payload);
  }

  @Roles('admin', 'doctor', 'nurse')
  @Post('create-treatment/:appointmentId')
  createTreatment(@Param('appointmentId') appointmentId: string) {
    return this.prescriptionsService.createTreatment(appointmentId);
  }

  @Roles('admin', 'doctor', 'nurse')
  @Delete('detail/:detailId')
  deleteDetail(@Param('detailId') detailId: string) {
    return this.prescriptionsService.deleteDetail(detailId);
  }

  @Roles('admin', 'doctor', 'nurse', 'patient')
  @Get('patient/:patientId')
  getByPatient(@Param('patientId') patientId: string) {
    return this.prescriptionsService.getByPatient(patientId);
  }
}
