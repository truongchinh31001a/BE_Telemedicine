import { Schema } from 'mongoose';

const objectId = Schema.Types.ObjectId;

export const UserSchema = new Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password_hash: { type: String, required: true },
    is_active: { type: Boolean, default: true },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    versionKey: false,
  },
);

export const UserProfileSchema = new Schema(
  {
    user_id: { type: objectId, ref: 'User', required: true, unique: true },
    full_name: { type: String, required: true, trim: true },
    date_of_birth: { type: Date },
    gender: { type: String, trim: true },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
    hometown: { type: String, trim: true },
    cccd: { type: String, trim: true, unique: true, sparse: true },
    cccd_issue_date: { type: Date },
    cccd_issue_place: { type: String, trim: true },
    cccd_expired_date: { type: Date },
    ethnicity: { type: String, trim: true },
    nationality: { type: String, trim: true },
    image_url: { type: String, trim: true },
    cccd_front_url: { type: String, trim: true },
    cccd_back_url: { type: String, trim: true },
  },
  { versionKey: false },
);

export const RoleSchema = new Schema(
  {
    role_name: { type: String, required: true, unique: true, trim: true },
  },
  { versionKey: false },
);

export const UserRoleSchema = new Schema(
  {
    user_id: { type: objectId, ref: 'User', required: true },
    role_id: { type: objectId, ref: 'Role', required: true },
  },
  { versionKey: false },
);
UserRoleSchema.index({ user_id: 1, role_id: 1 }, { unique: true });

export const AuthSessionSchema = new Schema(
  {
    user_id: { type: objectId, ref: 'User', required: true, index: true },
    session_id: { type: String, required: true, unique: true, trim: true },
    token_hash: { type: String, required: true },
    expires_at: { type: Date, required: true, index: true },
    revoked_at: { type: Date, default: null, index: true },
    replaced_by_session_id: { type: String, trim: true },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
    versionKey: false,
  },
);

export const DepartmentSchema = new Schema(
  {
    department_name: { type: String, required: true, unique: true, trim: true },
  },
  { versionKey: false },
);

export const StaffSchema = new Schema(
  {
    user_id: { type: objectId, ref: 'User', required: true, unique: true },
    department_id: { type: objectId, ref: 'Department', required: true },
    position: { type: String, trim: true },
  },
  { versionKey: false },
);

export const PatientSchema = new Schema(
  {
    user_id: { type: objectId, ref: 'User', required: true, unique: true },
    patient_code: { type: String, required: true, unique: true, trim: true },
    social_insurance_no: { type: String, trim: true },
    patient_job: { type: String, trim: true },
    membership_type: { type: String, trim: true },
  },
  { versionKey: false },
);

export const AppointmentSchema = new Schema(
  {
    staff_id: { type: objectId, ref: 'Staff', required: true },
    patient_id: { type: objectId, ref: 'Patient', required: true },
    record_id: { type: objectId, ref: 'MedicalRecord' },
    work_date: { type: Date, required: true },
    start_time: { type: String, required: true, trim: true },
    end_time: { type: String, required: true, trim: true },
    type: { type: String, trim: true },
    room: { type: String, trim: true },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'canceled'],
      default: 'pending',
    },
    note: { type: String, trim: true },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
    versionKey: false,
  },
);

export const AppointmentMemberSchema = new Schema(
  {
    appointment_id: { type: objectId, ref: 'Appointment', required: true },
    staff_id: { type: objectId, ref: 'Staff', required: true },
    member_role: { type: String, trim: true },
  },
  { versionKey: false },
);
AppointmentMemberSchema.index({ appointment_id: 1, staff_id: 1 }, { unique: true });

export const ScheduleSchema = new Schema(
  {
    department_id: { type: objectId, ref: 'Department', required: true },
    event_name: { type: String, required: true, trim: true },
    event_type: { type: String, trim: true },
    work_date: { type: Date, required: true },
    start_time: { type: String, required: true, trim: true },
    end_time: { type: String, required: true, trim: true },
    room: { type: String, trim: true },
    note: { type: String, trim: true },
  },
  { versionKey: false },
);

export const ScheduleMemberSchema = new Schema(
  {
    schedule_id: { type: objectId, ref: 'Schedule', required: true },
    staff_id: { type: objectId, ref: 'Staff', required: true },
  },
  { versionKey: false },
);
ScheduleMemberSchema.index({ schedule_id: 1, staff_id: 1 }, { unique: true });

export const MedicalRecordSchema = new Schema(
  {
    patient_id: { type: objectId, ref: 'Patient', required: true },
    staff_id: { type: objectId, ref: 'Staff', required: true },
    appointment_id: { type: objectId, ref: 'Appointment', unique: true, sparse: true },
    diagnosis: { type: String, trim: true },
    conclusion: { type: String, trim: true },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    versionKey: false,
  },
);

export const MedicalHistorySchema = new Schema(
  {
    record_id: { type: objectId, ref: 'MedicalRecord', required: true },
    type: { type: String, trim: true },
    title: { type: String, trim: true },
    note: { type: String, trim: true },
    history_date: { type: Date },
  },
  { versionKey: false },
);

export const VitalSchema = new Schema(
  {
    record_id: { type: objectId, ref: 'MedicalRecord', required: true },
    height_cm: { type: Number },
    weight_kg: { type: Number },
    temperature_c: { type: Number },
    heart_rate: { type: Number },
    blood_pressure: { type: String, trim: true },
    respiratory_rate: { type: Number },
    oxygen_saturation: { type: Number },
    note: { type: String, trim: true },
    measured_at: { type: Date, required: true },
  },
  { versionKey: false },
);

export const LabTestSchema = new Schema(
  {
    record_id: { type: objectId, ref: 'MedicalRecord', required: true },
    name: { type: String, required: true, trim: true },
    result: { type: String, trim: true },
    unit: { type: String, trim: true },
    reference_range: { type: String, trim: true },
    tested_at: { type: Date, required: true },
  },
  { versionKey: false },
);

export const ImagingTestSchema = new Schema(
  {
    record_id: { type: objectId, ref: 'MedicalRecord', required: true },
    name: { type: String, required: true, trim: true },
    result: { type: String, trim: true },
    note: { type: String, trim: true },
    tested_at: { type: Date, required: true },
  },
  { versionKey: false },
);

export const DrugSchema = new Schema(
  {
    drug_name: { type: String, required: true, trim: true },
    unit: { type: String, trim: true },
    stock: { type: Number, default: 0 },
  },
  { versionKey: false },
);

export const PrescriptionSchema = new Schema(
  {
    record_id: { type: objectId, ref: 'MedicalRecord', required: true },
    start_date: { type: Date, required: true },
    days: { type: Number, required: true },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
    versionKey: false,
  },
);

export const PrescriptionDetailSchema = new Schema(
  {
    prescription_id: { type: objectId, ref: 'Prescription', required: true },
    drug_id: { type: objectId, ref: 'Drug', required: true },
    unit: { type: String, trim: true },
    quantity: { type: Number, required: true },
    time_of_day: { type: String, trim: true },
    meal_timing: { type: String, trim: true },
    note: { type: String, trim: true },
  },
  { versionKey: false },
);

export const TelemedicineSchemas = [
  { name: 'User', schema: UserSchema },
  { name: 'UserProfile', schema: UserProfileSchema },
  { name: 'Role', schema: RoleSchema },
  { name: 'UserRole', schema: UserRoleSchema },
  { name: 'AuthSession', schema: AuthSessionSchema },
  { name: 'Department', schema: DepartmentSchema },
  { name: 'Staff', schema: StaffSchema },
  { name: 'Patient', schema: PatientSchema },
  { name: 'Appointment', schema: AppointmentSchema },
  { name: 'AppointmentMember', schema: AppointmentMemberSchema },
  { name: 'Schedule', schema: ScheduleSchema },
  { name: 'ScheduleMember', schema: ScheduleMemberSchema },
  { name: 'MedicalRecord', schema: MedicalRecordSchema },
  { name: 'MedicalHistory', schema: MedicalHistorySchema },
  { name: 'Vital', schema: VitalSchema },
  { name: 'LabTest', schema: LabTestSchema },
  { name: 'ImagingTest', schema: ImagingTestSchema },
  { name: 'Drug', schema: DrugSchema },
  { name: 'Prescription', schema: PrescriptionSchema },
  { name: 'PrescriptionDetail', schema: PrescriptionDetailSchema },
];
