import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { MasterDataService } from './master-data.service';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller()
export class MasterDataController {
  constructor(private readonly masterDataService: MasterDataService) {}

  @Roles('admin', 'doctor', 'nurse', 'patient')
  @Get('departments')
  getDepartments(@Query() query: Record<string, unknown>) {
    return this.masterDataService.getDepartments(query);
  }

  @Roles('admin', 'doctor', 'nurse', 'patient')
  @Get('departments/:id')
  getDepartmentDetail(@Param('id') id: string) {
    return this.masterDataService.getDepartmentDetail(id);
  }

  @Roles('admin')
  @Post('departments')
  createDepartment(@Body() payload: Record<string, unknown>) {
    return this.masterDataService.createDepartment(payload);
  }

  @Roles('admin')
  @Put('departments/:id')
  updateDepartment(@Param('id') id: string, @Body() payload: Record<string, unknown>) {
    return this.masterDataService.updateDepartment(id, payload);
  }

  @Roles('admin', 'doctor', 'nurse', 'patient')
  @Get('doctors')
  getDoctors(@Query() query: Record<string, unknown>) {
    return this.masterDataService.getDoctors(query);
  }

  @Roles('admin', 'doctor', 'nurse', 'patient')
  @Get('doctors/:id')
  getDoctorDetail(@Param('id') id: string) {
    return this.masterDataService.getDoctorDetail(id);
  }

  @Roles('admin')
  @Post('doctors')
  createDoctor(@Body() payload: Record<string, unknown>) {
    return this.masterDataService.createDoctor(payload);
  }

  @Roles('admin')
  @Put('doctors/:id')
  updateDoctor(@Param('id') id: string, @Body() payload: Record<string, unknown>) {
    return this.masterDataService.updateDoctor(id, payload);
  }

  @Roles('admin', 'doctor', 'nurse')
  @Get('staff')
  getStaff() {
    return this.masterDataService.getStaffList();
  }

  @Roles('admin', 'doctor', 'nurse')
  @Get('staff/:id')
  getStaffDetail(@Param('id') id: string) {
    return this.masterDataService.getStaffDetail(id);
  }

  @Roles('admin')
  @Post('staff')
  createStaff(@Body() payload: Record<string, unknown>) {
    return this.masterDataService.createStaff(payload);
  }

  @Roles('admin')
  @Put('staff/:id')
  updateStaff(@Param('id') id: string, @Body() payload: Record<string, unknown>) {
    return this.masterDataService.updateStaff(id, payload);
  }

  @Roles('admin', 'doctor', 'nurse')
  @Get('patients')
  getPatients() {
    return this.masterDataService.getPatients();
  }

  @Roles('admin', 'doctor', 'nurse', 'patient')
  @Get('patients/:id')
  getPatientDetail(@Param('id') id: string) {
    return this.masterDataService.getPatientDetail(id);
  }

  @Roles('admin')
  @Post('patients')
  createPatient(@Body() payload: Record<string, unknown>) {
    return this.masterDataService.createPatient(payload);
  }

  @Roles('admin')
  @Put('patients/:id')
  updatePatient(@Param('id') id: string, @Body() payload: Record<string, unknown>) {
    return this.masterDataService.updatePatient(id, payload);
  }

  @Roles('admin', 'doctor', 'nurse')
  @Get('drug')
  getDrugs() {
    return this.masterDataService.getDrugList();
  }

  @Roles('admin', 'doctor')
  @Post('drug')
  createDrug(@Body() payload: Record<string, unknown>) {
    return this.masterDataService.createDrug(payload);
  }
}
