import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { idText, pickAlias, requireObjectId, toIsoDate } from './common/alias.util';
import { NotificationsService } from './notifications.service';

@Injectable()
export class AppointmentService {
  constructor(
    @InjectModel('Appointment') private readonly appointmentModel: Model<any>,
    @InjectModel('Staff') private readonly staffModel: Model<any>,
    @InjectModel('Patient') private readonly patientModel: Model<any>,
    @InjectModel('UserProfile') private readonly userProfileModel: Model<any>,
    @InjectModel('Schedule') private readonly scheduleModel: Model<any>,
    @InjectModel('Department') private readonly departmentModel: Model<any>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getMyAppointments(query: Record<string, unknown>) {
    const staffId = pickAlias<string>(query, ['staffId', 'staff_id']);
    const patientId = pickAlias<string>(query, ['patientId', 'patient_id']);

    const filter: Record<string, unknown> = {};
    if (staffId) filter.staff_id = requireObjectId(staffId, 'staffId');
    if (patientId) filter.patient_id = requireObjectId(patientId, 'patientId');

    const appointments = await this.appointmentModel.find(filter).sort({ work_date: -1 }).lean();
    const staffIds = [...new Set(appointments.map((item: any) => String(item.staff_id)))];
    const patientIds = [...new Set(appointments.map((item: any) => String(item.patient_id)))];

    const [staffs, patients] = await Promise.all([
      this.staffModel.find({ _id: { $in: staffIds } }).lean(),
      this.patientModel.find({ _id: { $in: patientIds } }).lean(),
    ]);

    const staffUserIds = staffs.map((item: any) => item.user_id);
    const patientUserIds = patients.map((item: any) => item.user_id);

    const profiles = await this.userProfileModel
      .find({ user_id: { $in: [...staffUserIds, ...patientUserIds] } })
      .lean();

    const staffMap = new Map(staffs.map((item: any) => [String(item._id), item]));
    const patientMap = new Map(patients.map((item: any) => [String(item._id), item]));
    const profileMap = new Map(profiles.map((item: any) => [String(item.user_id), item]));

    return appointments.map((item: any) => {
      const staff = staffMap.get(String(item.staff_id));
      const patient = patientMap.get(String(item.patient_id));
      const staffProfile = staff ? profileMap.get(String(staff.user_id)) : null;
      const patientProfile = patient ? profileMap.get(String(patient.user_id)) : null;

      return {
        appointmentId: idText(item),
        workDate: item.work_date,
        startTime: item.start_time,
        endTime: item.end_time,
        staffId: String(item.staff_id),
        patientId: String(item.patient_id),
        staffName: staffProfile?.full_name ?? '',
        patientName: patientProfile?.full_name ?? '',
        room: item.room ?? '',
        type: item.type ?? '',
        status: item.status,
        note: item.note ?? '',
        recordId: item.record_id ? String(item.record_id) : null,
      };
    });
  }

  async cancelAppointment(appointmentId: string) {
    const appointment = await this.appointmentModel.findById(
      requireObjectId(appointmentId, 'appointmentId'),
    );
    if (!appointment) throw new NotFoundException('Appointment not found');

    const [staff, patient] = await Promise.all([
      this.staffModel.findById(appointment.staff_id).lean(),
      this.patientModel.findById(appointment.patient_id).lean(),
    ]);

    appointment.status = 'canceled';
    await appointment.save();

    if (patient?.user_id) {
      await this.notificationsService.create({
        userId: String(patient.user_id),
        title: 'Lich kham da bi huy',
        message: `Lich kham ngay ${appointment.work_date?.toISOString?.().slice(0, 10) ?? ''} luc ${appointment.start_time} da duoc huy.`,
        type: 'appointment',
        refType: 'Appointment',
        refId: String(appointment._id),
        metadata: {
          appointmentId: String(appointment._id),
          status: 'canceled',
        },
      });
    }

    if (staff?.user_id) {
      await this.notificationsService.create({
        userId: String(staff.user_id),
        title: 'Lich kham da bi huy',
        message: `Cuoc hen ngay ${appointment.work_date?.toISOString?.().slice(0, 10) ?? ''} luc ${appointment.start_time} da bi huy.`,
        type: 'appointment',
        refType: 'Appointment',
        refId: String(appointment._id),
        metadata: {
          appointmentId: String(appointment._id),
          status: 'canceled',
        },
      });
    }

    return { success: true, message: 'Appointment canceled' };
  }

  async createSchedule(payload: Record<string, unknown>) {
    const staffId = pickAlias<string>(payload, ['staffId', 'staff_id']);
    const workDate = pickAlias(payload, ['workDate', 'work_date']);
    const startTime = pickAlias(payload, ['startTime', 'start_time']);
    const endTime = pickAlias(payload, ['endTime', 'end_time']);

    if (!staffId || !workDate || !startTime || !endTime) {
      throw new BadRequestException('staffId, workDate, startTime, endTime are required');
    }

    const staff = await this.staffModel.findById(requireObjectId(staffId, 'staffId')).lean();
    if (!staff) throw new NotFoundException('Staff not found');

    const schedule = await this.scheduleModel.create({
      department_id: staff.department_id,
      event_name: 'Working shift',
      event_type: pickAlias(payload, ['eventType', 'event_type', 'type'], 'Kham'),
      work_date: toIsoDate(workDate, 'workDate'),
      start_time: String(startTime),
      end_time: String(endTime),
      room: pickAlias(payload, ['room']),
      note: pickAlias(payload, ['note']),
    });

    return {
      scheduleId: idText(schedule),
      staffId,
      departmentId: String(staff.department_id),
      workDate: schedule.work_date,
      startTime: schedule.start_time,
      endTime: schedule.end_time,
      room: schedule.room ?? '',
    };
  }

  async getAvailableSlots(query: Record<string, unknown>) {
    const departmentId = pickAlias<string>(query, ['departmentId', 'department_id']);
    const staffId = pickAlias<string>(query, ['staffId', 'staff_id']);
    const date = pickAlias(query, ['date']);
    const fromDate = pickAlias(query, ['fromDate', 'from_date']);
    const toDate = pickAlias(query, ['toDate', 'to_date']);

    const filter: Record<string, unknown> = {};
    if (departmentId) filter.department_id = requireObjectId(departmentId, 'departmentId');

    if (date) {
      const d = toIsoDate(date, 'date');
      const next = new Date(d);
      next.setUTCDate(d.getUTCDate() + 1);
      filter.work_date = { $gte: d, $lt: next };
    } else if (fromDate || toDate) {
      filter.work_date = {};
      if (fromDate) (filter.work_date as Record<string, unknown>).$gte = toIsoDate(fromDate, 'fromDate');
      if (toDate) (filter.work_date as Record<string, unknown>).$lte = toIsoDate(toDate, 'toDate');
    }

    const schedules = await this.scheduleModel.find(filter).sort({ work_date: 1, start_time: 1 }).lean();

    const staffs = await this.staffModel
      .find(staffId ? { _id: requireObjectId(staffId, 'staffId') } : {})
      .lean();

    const staffMap = new Map(staffs.map((item: any) => [String(item._id), item]));
    const userIds = staffs.map((item: any) => item.user_id);
    const [profiles, departments] = await Promise.all([
      this.userProfileModel.find({ user_id: { $in: userIds } }).lean(),
      this.departmentModel.find().lean(),
    ]);

    const profileMap = new Map(profiles.map((item: any) => [String(item.user_id), item]));
    const deptMap = new Map(departments.map((item: any) => [String(item._id), item]));

    const appointmentFilter: Record<string, unknown> = { status: { $ne: 'canceled' } };
    if (date) {
      const d = toIsoDate(date, 'date');
      const next = new Date(d);
      next.setUTCDate(d.getUTCDate() + 1);
      appointmentFilter.work_date = { $gte: d, $lt: next };
    }
    const appointments = await this.appointmentModel.find(appointmentFilter).lean();

    return schedules
      .map((item: any) => {
        const staff = staffs.find((s: any) => String(s.department_id) === String(item.department_id));
        if (!staff) return null;
        if (staffId && String(staff._id) !== String(staffId)) return null;

        const profile = profileMap.get(String(staff.user_id));
        const dept = deptMap.get(String(item.department_id));

        const overlapped = appointments.some(
          (appt: any) =>
            String(appt.staff_id) === String(staff._id) &&
            appt.work_date?.toISOString?.().slice(0, 10) === item.work_date?.toISOString?.().slice(0, 10) &&
            appt.start_time === item.start_time &&
            appt.end_time === item.end_time,
        );

        return {
          workDate: item.work_date,
          startTime: item.start_time,
          endTime: item.end_time,
          staffId: String(staff._id),
          staffName: profile?.full_name ?? '',
          departmentId: String(item.department_id),
          departmentName: dept?.department_name ?? '',
          room: item.room ?? '',
          type: item.event_type ?? '',
          available: !overlapped,
        };
      })
      .filter(Boolean);
  }
}
