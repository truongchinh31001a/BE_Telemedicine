import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppointmentController } from './appointment.controller';
import { AppointmentService } from './appointment.service';
import { MasterDataController } from './master-data.controller';
import { MasterDataService } from './master-data.service';
import { ClinicalTestsController, MedicalRecordsController } from './medical-records.controller';
import { MedicalRecordsService } from './medical-records.service';
import { PrescriptionsController } from './prescriptions.controller';
import { PrescriptionsService } from './prescriptions.service';
import { TelemedicineSchemas } from '../database/schemas/telemedicine.schemas';

@Module({
  imports: [MongooseModule.forFeature(TelemedicineSchemas)],
  controllers: [
    MasterDataController,
    AppointmentController,
    MedicalRecordsController,
    ClinicalTestsController,
    PrescriptionsController,
  ],
  providers: [
    MasterDataService,
    AppointmentService,
    MedicalRecordsService,
    PrescriptionsService,
  ],
})
export class ApiModule {}
