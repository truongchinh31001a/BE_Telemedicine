# Service and API List

## Services

1. `AppService` - `src/app.service.ts`
2. `AuthService` - `src/auth/auth.service.ts`
3. `AppointmentService` - `src/api/appointment.service.ts`
4. `MasterDataService` - `src/api/master-data.service.ts`
5. `MedicalRecordsService` - `src/api/medical-records.service.ts`
6. `PrescriptionsService` - `src/api/prescriptions.service.ts`

## APIs

| Method | Path | Controller | Roles |
|---|---|---|---|
| GET | `/` | `AppController.getHello` | Public |
| POST | `/auth/login` | `AuthController.login` | Public |
| POST | `/auth/refresh` | `AuthController.refresh` | Public |
| POST | `/auth/logout` | `AuthController.logout` | Public |
| GET | `/auth/me` | `AuthController.me` | Authenticated |
| GET | `/appointment/me` | `AppointmentController.getMe` | admin, doctor, nurse, patient |
| PATCH | `/appointment/:appointmentId/cancel` | `AppointmentController.cancel` | admin, doctor, nurse, patient |
| POST | `/appointment/schedule` | `AppointmentController.createSchedule` | admin, doctor, nurse |
| GET | `/appointment/available-slots` | `AppointmentController.getAvailableSlots` | admin, doctor, nurse, patient |
| GET | `/departments` | `MasterDataController.getDepartments` | admin, doctor, nurse, patient |
| GET | `/staff` | `MasterDataController.getStaff` | admin, doctor, nurse |
| GET | `/staff/:id` | `MasterDataController.getStaffDetail` | admin, doctor, nurse |
| POST | `/staff` | `MasterDataController.createStaff` | admin |
| PUT | `/staff/:id` | `MasterDataController.updateStaff` | admin |
| GET | `/patients` | `MasterDataController.getPatients` | admin, doctor, nurse |
| GET | `/patients/:id` | `MasterDataController.getPatientDetail` | admin, doctor, nurse, patient |
| POST | `/patients` | `MasterDataController.createPatient` | admin |
| PUT | `/patients/:id` | `MasterDataController.updatePatient` | admin |
| GET | `/drug` | `MasterDataController.getDrugs` | admin, doctor, nurse |
| POST | `/drug` | `MasterDataController.createDrug` | admin, doctor |
| POST | `/medical-records` | `MedicalRecordsController.create` | admin, doctor, nurse |
| PUT | `/medical-records/:id` | `MedicalRecordsController.update` | admin, doctor, nurse |
| GET | `/medical-records/records/:id` | `MedicalRecordsController.getById` | admin, doctor, nurse, patient |
| GET | `/medical-records/patient/prescriptions` | `MedicalRecordsController.getPatientPrescriptions` | admin, doctor, nurse, patient |
| GET | `/medical-records/patient/:id` | `MedicalRecordsController.getByPatient` | admin, doctor, nurse, patient |
| GET | `/medical-records/patient/history/:id` | `MedicalRecordsController.getPatientHistory` | admin, doctor, nurse, patient |
| PUT | `/medical-records/history/:type/:id` | `MedicalRecordsController.updateHistory` | admin, doctor, nurse |
| POST | `/medical-records/vitals` | `MedicalRecordsController.createVitals` | admin, doctor, nurse |
| GET | `/medical-records/patient/vitals/:id` | `MedicalRecordsController.getPatientVitals` | admin, doctor, nurse, patient |
| PUT | `/medical-records/vitals/edit/:id` | `MedicalRecordsController.updateVitals` | admin, doctor, nurse |
| GET | `/lab-tests/:id` | `ClinicalTestsController.getLabTests` | admin, doctor, nurse, patient |
| GET | `/imaging-tests/:id` | `ClinicalTestsController.getImagingTests` | admin, doctor, nurse, patient |
| GET | `/prescriptions/:id` | `PrescriptionsController.getById` | admin, doctor, nurse, patient |
| POST | `/prescriptions/:recordId` | `PrescriptionsController.createDetails` | admin, doctor, nurse |
| PUT | `/prescriptions/detail` | `PrescriptionsController.updateDetail` | admin, doctor, nurse |
| PUT | `/prescriptions/:recordId` | `PrescriptionsController.updatePrescription` | admin, doctor, nurse |
| PUT | `/prescriptions/:type/:id` | `PrescriptionsController.legacyUpdate` | admin, doctor, nurse |
| POST | `/prescriptions/create-treatment/:appointmentId` | `PrescriptionsController.createTreatment` | admin, doctor, nurse |
| DELETE | `/prescriptions/detail/:detailId` | `PrescriptionsController.deleteDetail` | admin, doctor, nurse |
| GET | `/prescriptions/patient/:patientId` | `PrescriptionsController.getByPatient` | admin, doctor, nurse, patient |
