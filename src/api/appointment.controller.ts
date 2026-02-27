import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { AppointmentService } from './appointment.service';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('appointment')
export class AppointmentController {
  constructor(private readonly appointmentService: AppointmentService) {}

  @Roles('admin', 'doctor', 'nurse', 'patient')
  @Get('me')
  getMe(@Query() query: Record<string, unknown>) {
    return this.appointmentService.getMyAppointments(query);
  }

  @Roles('admin', 'doctor', 'nurse', 'patient')
  @Patch(':appointmentId/cancel')
  cancel(@Param('appointmentId') appointmentId: string) {
    return this.appointmentService.cancelAppointment(appointmentId);
  }

  @Roles('admin', 'doctor', 'nurse')
  @Post('schedule')
  createSchedule(@Body() payload: Record<string, unknown>) {
    return this.appointmentService.createSchedule(payload);
  }

  @Roles('admin', 'doctor', 'nurse', 'patient')
  @Get('available-slots')
  getAvailableSlots(@Query() query: Record<string, unknown>) {
    return this.appointmentService.getAvailableSlots(query);
  }
}
