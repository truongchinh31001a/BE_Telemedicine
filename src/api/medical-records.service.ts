import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { idText, pickAlias, requireObjectId, toIsoDate } from './common/alias.util';

@Injectable()
export class MedicalRecordsService {
  constructor(
    @InjectModel('MedicalRecord') private readonly medicalRecordModel: Model<any>,
    @InjectModel('MedicalHistory') private readonly medicalHistoryModel: Model<any>,
    @InjectModel('Vital') private readonly vitalModel: Model<any>,
    @InjectModel('LabTest') private readonly labTestModel: Model<any>,
    @InjectModel('ImagingTest') private readonly imagingTestModel: Model<any>,
    @InjectModel('Appointment') private readonly appointmentModel: Model<any>,
    @InjectModel('Prescription') private readonly prescriptionModel: Model<any>,
  ) {}

  async createMedicalRecord(payload: Record<string, unknown>) {
    const patientId = pickAlias<string>(payload, ['patientId', 'patient_id', 'PatientID']);
    const staffId = pickAlias<string>(payload, ['staffId', 'staff_id', 'StaffID']);
    const appointmentId = pickAlias<string>(payload, [
      'appointmentId',
      'appointment_id',
      'AppointmentID',
    ]);

    if (!patientId || !staffId) {
      throw new BadRequestException('patientId and staffId are required');
    }

    const createPayload: Record<string, unknown> = {
      patient_id: requireObjectId(patientId, 'patientId'),
      staff_id: requireObjectId(staffId, 'staffId'),
      diagnosis: pickAlias(payload, ['diagnosis']),
      conclusion: pickAlias(payload, ['conclusion']),
    };

    if (appointmentId) {
      createPayload.appointment_id = requireObjectId(appointmentId, 'appointmentId');
    }

    const record = await this.medicalRecordModel.create(createPayload);

    if (appointmentId) {
      await this.appointmentModel.updateOne(
        { _id: requireObjectId(appointmentId, 'appointmentId') },
        { $set: { record_id: record._id } },
      );
    }

    return this.toRecordResponse(record);
  }

  async updateMedicalRecord(id: string, payload: Record<string, unknown>) {
    const setData: Record<string, unknown> = {};
    const diagnosis = pickAlias(payload, ['diagnosis']);
    const conclusion = pickAlias(payload, ['conclusion']);
    const staffId = pickAlias(payload, ['staffId', 'staff_id', 'StaffID']);
    const patientId = pickAlias(payload, ['patientId', 'patient_id', 'PatientID']);

    if (diagnosis !== undefined) setData.diagnosis = diagnosis;
    if (conclusion !== undefined) setData.conclusion = conclusion;
    if (staffId) setData.staff_id = requireObjectId(staffId, 'staffId');
    if (patientId) setData.patient_id = requireObjectId(patientId, 'patientId');

    const record = await this.medicalRecordModel.findByIdAndUpdate(
      requireObjectId(id, 'id'),
      { $set: setData },
      { returnDocument: 'after' },
    );
    if (!record) throw new NotFoundException('Medical record not found');
    return this.toRecordResponse(record);
  }

  async getRecordById(id: string) {
    const record = await this.medicalRecordModel.findById(requireObjectId(id, 'id')).lean();
    if (!record) throw new NotFoundException('Medical record not found');
    return this.toRecordResponse(record);
  }

  async getRecordsByPatientId(patientId: string) {
    const records = await this.medicalRecordModel
      .find({ patient_id: requireObjectId(patientId, 'patientId') })
      .sort({ created_at: -1 })
      .lean();
    return records.map((item: any) => this.toRecordResponse(item));
  }

  async getPatientHistory(patientId: string) {
    const records = await this.medicalRecordModel
      .find({ patient_id: requireObjectId(patientId, 'patientId') })
      .lean();
    const recordIds = records.map((item: any) => item._id);
    const histories = await this.medicalHistoryModel.find({ record_id: { $in: recordIds } }).lean();
    return histories.map((item: any) => ({
      historyId: idText(item),
      recordId: String(item.record_id),
      type: item.type,
      title: item.title,
      note: item.note,
      date: item.history_date,
      status: pickAlias(item, ['status'], 'active'),
    }));
  }

  async updateHistory(type: string, id: string, payload: Record<string, unknown>) {
    const setData: Record<string, unknown> = { type };
    ['title', 'note'].forEach((field) => {
      const value = pickAlias(payload, [field]);
      if (value !== undefined) setData[field] = value;
    });
    const historyDate = pickAlias(payload, ['date', 'historyDate', 'history_date']);
    if (historyDate !== undefined) setData.history_date = toIsoDate(historyDate, 'date');
    const status = pickAlias(payload, ['status']);
    if (status !== undefined) setData.status = status;

    const history = await this.medicalHistoryModel.findByIdAndUpdate(
      requireObjectId(id, 'id'),
      { $set: setData },
      { returnDocument: 'after' },
    );

    if (!history) throw new NotFoundException('Medical history not found');

    return {
      historyId: idText(history),
      recordId: String(history.record_id),
      type: history.type,
      title: history.title,
      note: history.note,
      date: history.history_date,
      status: pickAlias(history, ['status'], 'active'),
    };
  }

  async createVitals(payload: Record<string, unknown>) {
    const recordId = pickAlias<string>(payload, ['recordId', 'record_id', 'RecordID']);
    if (!recordId) throw new BadRequestException('recordId is required');

    const vital = await this.vitalModel.create({
      record_id: requireObjectId(recordId, 'recordId'),
      height_cm: Number(pickAlias(payload, ['height', 'heightCm', 'height_cm'])),
      weight_kg: Number(pickAlias(payload, ['weight', 'weightKg', 'weight_kg'])),
      temperature_c: Number(pickAlias(payload, ['temperature', 'temperatureC', 'temperature_c'])),
      heart_rate: Number(pickAlias(payload, ['heartRate', 'heart_rate'])),
      blood_pressure: pickAlias(payload, ['bloodPressure', 'blood_pressure']),
      respiratory_rate: Number(pickAlias(payload, ['respiratoryRate', 'respiratory_rate'])),
      oxygen_saturation: Number(pickAlias(payload, ['oxygenSaturation', 'oxygen_saturation'])),
      note: pickAlias(payload, ['note']),
      measured_at: pickAlias(payload, ['measuredAt', 'measured_at'])
        ? toIsoDate(pickAlias(payload, ['measuredAt', 'measured_at']), 'measuredAt')
        : new Date(),
    });

    return this.toVitalResponse(vital);
  }

  async getPatientVitals(patientId: string) {
    const records = await this.medicalRecordModel
      .find({ patient_id: requireObjectId(patientId, 'patientId') })
      .lean();
    const recordIds = records.map((item: any) => item._id);
    const vitals = await this.vitalModel
      .find({ record_id: { $in: recordIds } })
      .sort({ measured_at: -1 })
      .lean();
    return vitals.map((item: any) => this.toVitalResponse(item));
  }

  async updateVitals(id: string, payload: Record<string, unknown>) {
    const setData: Record<string, unknown> = {};

    const numberFields: Array<[string[], string]> = [
      [['height', 'heightCm', 'height_cm'], 'height_cm'],
      [['weight', 'weightKg', 'weight_kg'], 'weight_kg'],
      [['temperature', 'temperatureC', 'temperature_c'], 'temperature_c'],
      [['heartRate', 'heart_rate'], 'heart_rate'],
      [['respiratoryRate', 'respiratory_rate'], 'respiratory_rate'],
      [['oxygenSaturation', 'oxygen_saturation'], 'oxygen_saturation'],
    ];

    numberFields.forEach(([aliases, field]) => {
      const value = pickAlias(payload, aliases);
      if (value !== undefined) setData[field] = Number(value);
    });

    const bloodPressure = pickAlias(payload, ['bloodPressure', 'blood_pressure']);
    if (bloodPressure !== undefined) setData.blood_pressure = bloodPressure;
    const note = pickAlias(payload, ['note']);
    if (note !== undefined) setData.note = note;

    const vital = await this.vitalModel.findByIdAndUpdate(requireObjectId(id, 'id'), { $set: setData }, { returnDocument: 'after' });
    if (!vital) throw new NotFoundException('Vital not found');
    return this.toVitalResponse(vital);
  }

  async getLabTestsByRecordId(recordId: string) {
    const tests = await this.labTestModel
      .find({ record_id: requireObjectId(recordId, 'recordId') })
      .sort({ tested_at: -1 })
      .lean();
    return tests.map((item: any) => ({
      labTestId: idText(item),
      recordId: String(item.record_id),
      name: item.name,
      result: item.result,
      unit: item.unit,
      referenceRange: item.reference_range,
      testedAt: item.tested_at,
    }));
  }

  async getImagingTestsByRecordId(recordId: string) {
    const tests = await this.imagingTestModel
      .find({ record_id: requireObjectId(recordId, 'recordId') })
      .sort({ tested_at: -1 })
      .lean();
    return tests.map((item: any) => ({
      imagingTestId: idText(item),
      recordId: String(item.record_id),
      name: item.name,
      result: item.result,
      note: item.note,
      testedAt: item.tested_at,
    }));
  }

  async getPatientPrescriptions(patientIdRaw: string) {
    const patientId = requireObjectId(patientIdRaw, 'patientId');
    const records = await this.medicalRecordModel.find({ patient_id: patientId }).lean();
    const recordIds = records.map((item: any) => item._id);
    const prescriptions = await this.prescriptionModel
      .find({ record_id: { $in: recordIds } })
      .sort({ created_at: -1 })
      .lean();
    return prescriptions.map((item: any) => ({
      prescriptionId: idText(item),
      recordId: String(item.record_id),
      startDate: item.start_date,
      days: item.days,
      createdAt: item.created_at,
    }));
  }

  private toRecordResponse(record: any) {
    return {
      recordId: idText(record),
      patientId: String(record.patient_id),
      staffId: String(record.staff_id),
      appointmentId: record.appointment_id ? String(record.appointment_id) : null,
      diagnosis: record.diagnosis,
      conclusion: record.conclusion,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    };
  }

  private toVitalResponse(vital: any) {
    return {
      vitalsId: idText(vital),
      recordId: String(vital.record_id),
      height: vital.height_cm,
      weight: vital.weight_kg,
      temperature: vital.temperature_c,
      heartRate: vital.heart_rate,
      bloodPressure: vital.blood_pressure,
      respiratoryRate: vital.respiratory_rate,
      oxygenSaturation: vital.oxygen_saturation,
      note: vital.note,
      measuredAt: vital.measured_at,
    };
  }
}
