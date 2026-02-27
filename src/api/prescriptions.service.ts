import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { idText, pickAlias, requireObjectId, toIsoDate } from './common/alias.util';

@Injectable()
export class PrescriptionsService {
  constructor(
    @InjectModel('Prescription') private readonly prescriptionModel: Model<any>,
    @InjectModel('PrescriptionDetail') private readonly prescriptionDetailModel: Model<any>,
    @InjectModel('Drug') private readonly drugModel: Model<any>,
    @InjectModel('MedicalRecord') private readonly medicalRecordModel: Model<any>,
    @InjectModel('Appointment') private readonly appointmentModel: Model<any>,
  ) {}

  async getByRecordId(recordId: string) {
    const prescription = await this.prescriptionModel
      .findOne({ record_id: requireObjectId(recordId, 'recordId') })
      .sort({ created_at: -1 })
      .lean();

    if (!prescription) throw new NotFoundException('Prescription not found');

    const details = await this.prescriptionDetailModel
      .find({ prescription_id: prescription._id })
      .lean();

    const drugIds = details.map((item: any) => item.drug_id);
    const drugs = await this.drugModel.find({ _id: { $in: drugIds } }).lean();
    const drugMap = new Map(drugs.map((item: any) => [String(item._id), item]));

    return {
      prescriptionId: idText(prescription),
      recordId: String(prescription.record_id),
      startDate: prescription.start_date,
      days: prescription.days,
      details: details.map((item: any) => ({
        detailId: idText(item),
        drugId: String(item.drug_id),
        drugName: drugMap.get(String(item.drug_id))?.drug_name ?? '',
        unit: item.unit,
        quantity: item.quantity,
        timeOfDay: item.time_of_day,
        mealTiming: item.meal_timing,
        note: item.note,
      })),
    };
  }

  async createDetails(recordId: string, payload: unknown) {
    const normalizedRecordId = requireObjectId(recordId, 'recordId');
    const prescription = await this.prescriptionModel.findOneAndUpdate(
      { record_id: normalizedRecordId },
      {
        $setOnInsert: {
          record_id: normalizedRecordId,
          start_date: new Date(),
          days: 1,
        },
      },
      { upsert: true, returnDocument: 'after' },
    );

    if (!Array.isArray(payload)) {
      throw new BadRequestException('Body must be PrescriptionDetail[]');
    }

    const docs = payload.map((item: Record<string, unknown>) => {
      const drugId = pickAlias<string>(item, ['drugId', 'drug_id', 'DrugID']);
      if (!drugId) throw new BadRequestException('drugId is required in details');
      return {
        prescription_id: prescription._id,
        drug_id: requireObjectId(drugId, 'drugId'),
        unit: pickAlias(item, ['unit']),
        quantity: Number(pickAlias(item, ['quantity'], 0)),
        time_of_day: pickAlias(item, ['timeOfDay', 'time_of_day']),
        meal_timing: pickAlias(item, ['mealTiming', 'meal_timing']),
        note: pickAlias(item, ['note']),
      };
    });

    await this.prescriptionDetailModel.insertMany(docs);
    return this.getByRecordId(recordId);
  }

  async updatePrescription(recordId: string, payload: Record<string, unknown>) {
    const startDate = pickAlias(payload, ['startDate', 'start_date', 'StartDate']);
    const days = pickAlias(payload, ['days', 'Days']);

    const updateData: Record<string, unknown> = {};
    if (startDate !== undefined) updateData.start_date = toIsoDate(startDate, 'startDate');
    if (days !== undefined) updateData.days = Number(days);

    const prescription = await this.prescriptionModel.findOneAndUpdate(
      { record_id: requireObjectId(recordId, 'recordId') },
      {
        $set: updateData,
        $setOnInsert: {
          record_id: requireObjectId(recordId, 'recordId'),
        },
      },
      { upsert: true, returnDocument: 'after' },
    );

    return {
      prescriptionId: idText(prescription),
      recordId: String(prescription.record_id),
      startDate: prescription.start_date,
      days: prescription.days,
    };
  }

  async legacyUpdate(type: string, id: string, payload: Record<string, unknown>) {
    if (type === 'detail') {
      return this.updateDetail({ ...payload, detailId: id });
    }

    const startDate = pickAlias(payload, ['startDate', 'start_date']);
    const days = pickAlias(payload, ['days']);
    const setData: Record<string, unknown> = {};
    if (startDate !== undefined) setData.start_date = toIsoDate(startDate, 'startDate');
    if (days !== undefined) setData.days = Number(days);

    const prescription = await this.prescriptionModel.findByIdAndUpdate(
      requireObjectId(id, 'id'),
      { $set: setData },
      { returnDocument: 'after' },
    );

    if (!prescription) throw new NotFoundException('Prescription not found');

    return {
      prescriptionId: idText(prescription),
      recordId: String(prescription.record_id),
      startDate: prescription.start_date,
      days: prescription.days,
    };
  }

  async createTreatment(appointmentId: string) {
    const appointment = await this.appointmentModel.findById(
      requireObjectId(appointmentId, 'appointmentId'),
      { record_id: 1 },
    );
    if (!appointment?.record_id) {
      throw new NotFoundException('Appointment or linked medical record not found');
    }

    const prescription = await this.prescriptionModel.findOneAndUpdate(
      { record_id: appointment.record_id },
      {
        $setOnInsert: {
          record_id: appointment.record_id,
          start_date: new Date(),
          days: 1,
        },
      },
      { upsert: true, returnDocument: 'after' },
    );

    return {
      prescriptionId: idText(prescription),
      recordId: String(prescription.record_id),
      startDate: prescription.start_date,
      days: prescription.days,
    };
  }

  async updateDetail(payload: Record<string, unknown>) {
    const detailId = pickAlias<string>(payload, ['detailId', 'detail_id', 'DetailID']);
    if (!detailId) throw new BadRequestException('detailId is required');

    const setData: Record<string, unknown> = {};
    const drugId = pickAlias<string>(payload, ['drugId', 'drug_id']);
    if (drugId) setData.drug_id = requireObjectId(drugId, 'drugId');

    const mapping: Array<[string[], string]> = [
      [['unit'], 'unit'],
      [['timeOfDay', 'time_of_day'], 'time_of_day'],
      [['mealTiming', 'meal_timing'], 'meal_timing'],
      [['note'], 'note'],
    ];
    mapping.forEach(([aliases, field]) => {
      const value = pickAlias(payload, aliases);
      if (value !== undefined) setData[field] = value;
    });

    const quantity = pickAlias(payload, ['quantity']);
    if (quantity !== undefined) setData.quantity = Number(quantity);

    const detail = await this.prescriptionDetailModel.findByIdAndUpdate(
      requireObjectId(detailId, 'detailId'),
      { $set: setData },
      { returnDocument: 'after' },
    );

    if (!detail) throw new NotFoundException('Prescription detail not found');

    return {
      detailId: idText(detail),
      prescriptionId: String(detail.prescription_id),
      drugId: String(detail.drug_id),
      unit: detail.unit,
      quantity: detail.quantity,
      timeOfDay: detail.time_of_day,
      mealTiming: detail.meal_timing,
      note: detail.note,
    };
  }

  async deleteDetail(detailId: string) {
    const result = await this.prescriptionDetailModel.findByIdAndDelete(
      requireObjectId(detailId, 'detailId'),
    );
    if (!result) throw new NotFoundException('Prescription detail not found');
    return { success: true };
  }

  async getByPatient(patientId: string) {
    const records = await this.medicalRecordModel
      .find({ patient_id: requireObjectId(patientId, 'patientId') })
      .lean();
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
}
