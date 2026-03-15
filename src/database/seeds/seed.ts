import 'dotenv/config';
import { createHash } from 'node:crypto';
import mongoose from 'mongoose';
import { TelemedicineSchemas } from '../schemas/telemedicine.schemas';

const mongoUri =
  process.env.MONGODB_URI ??
  process.env.MONGO_URI ??
  'mongodb://127.0.0.1:27017/telemedicine';

const passwordHash = (plainText: string) =>
  createHash('sha256').update(plainText).digest('hex');

async function runSeed() {
  await mongoose.connect(mongoUri);

  const models = new Map(
    TelemedicineSchemas.map(({ name, schema }) => [
      name,
      mongoose.models[name] ?? mongoose.model(name, schema),
    ]),
  );

  const Role = models.get('Role')!;
  const User = models.get('User')!;
  const UserProfile = models.get('UserProfile')!;
  const UserRole = models.get('UserRole')!;
  const Department = models.get('Department')!;
  const Staff = models.get('Staff')!;
  const Doctor = models.get('Doctor')!;
  const Patient = models.get('Patient')!;
  const Appointment = models.get('Appointment')!;
  const MedicalRecord = models.get('MedicalRecord')!;
  const Vital = models.get('Vital')!;
  const Prescription = models.get('Prescription')!;
  const Drug = models.get('Drug')!;
  const PrescriptionDetail = models.get('PrescriptionDetail')!;

  const [adminRole, doctorRole, nurseRole, patientRole] = await Promise.all([
    Role.findOneAndUpdate(
      { role_name: 'admin' },
      { $set: { role_name: 'admin' } },
      { upsert: true, returnDocument: 'after' },
    ),
    Role.findOneAndUpdate(
      { role_name: 'doctor' },
      { $set: { role_name: 'doctor' } },
      { upsert: true, returnDocument: 'after' },
    ),
    Role.findOneAndUpdate(
      { role_name: 'nurse' },
      { $set: { role_name: 'nurse' } },
      { upsert: true, returnDocument: 'after' },
    ),
    Role.findOneAndUpdate(
      { role_name: 'patient' },
      { $set: { role_name: 'patient' } },
      { upsert: true, returnDocument: 'after' },
    ),
  ]);

  const [internalDept, cardioDept] = await Promise.all([
    Department.findOneAndUpdate(
      { department_name: 'Noi tong quat' },
      {
        $set: {
          department_name: 'Noi tong quat',
          department_code: 'KN001',
          room: 'P101',
          type: 'Lam sang',
          phone: '02812345678',
          email: 'khoanoi@hospital.vn',
          status: 'Hoat dong',
          avatar: '/images/departments/khoanoi.png',
          description: 'Khoa Noi tiep nhan va dieu tri cac benh ly noi khoa tong quat.',
          services: 'Kham noi tong quat, tu van dieu tri, theo doi benh man tinh.',
          functions: 'Tham kham, chan doan, dieu tri noi khoa va quan ly benh an.',
          other_info: 'Ho tro dat lich kham truc tuyen va tai kham dinh ky.',
          attachments: [{ name: 'Tong quan khoa noi.pdf', url: '/files/departments/khoanoi-overview.pdf' }],
          related_departments: [{ code: 'KH001', name: 'Khoa Hoi suc' }],
        },
        $unset: { members: '' },
      },
      { upsert: true, returnDocument: 'after' },
    ),
    Department.findOneAndUpdate(
      { department_name: 'Tim mach' },
      {
        $set: {
          department_name: 'Tim mach',
          department_code: 'TM001',
          room: 'P201',
          type: 'Chuyen khoa',
          phone: '02898765432',
          email: 'timmach@hospital.vn',
          status: 'Hoat dong',
          avatar: '/images/departments/timmach.png',
          description: 'Khoa Tim mach chuyen kham va dieu tri cac benh ly tim mach.',
          services: 'Dien tim, sieu am tim, theo doi va dieu tri benh tim mach.',
          functions: 'Chan doan va dieu tri benh tim mach, cap cuu tim mach.',
          other_info: 'Co lich kham uu tien cho benh nhan tai kham.',
          attachments: [{ name: 'Dich vu khoa tim mach.pdf', url: '/files/departments/timmach-services.pdf' }],
          related_departments: [{ code: 'KN001', name: 'Khoa Noi' }],
        },
        $unset: { members: '' },
      },
      { upsert: true, returnDocument: 'after' },
    ),
  ]);

  await Department.collection.updateMany({}, { $unset: { members: '' } });

  const adminUser = await User.findOneAndUpdate(
    { username: 'admin' },
    {
      $set: {
        email: 'admin@telemedicine.local',
        password_hash: passwordHash('Admin@123'),
        is_active: true,
      },
      $setOnInsert: { username: 'admin' },
    },
    { upsert: true, returnDocument: 'after' },
  );

  const doctorUser = await User.findOneAndUpdate(
    { username: 'doctor01' },
    {
      $set: {
        email: 'doctor01@telemedicine.local',
        password_hash: passwordHash('Doctor@123'),
        is_active: true,
      },
      $setOnInsert: { username: 'doctor01' },
    },
    { upsert: true, returnDocument: 'after' },
  );

  const patientUser = await User.findOneAndUpdate(
    { username: 'patient01' },
    {
      $set: {
        email: 'patient01@telemedicine.local',
        password_hash: passwordHash('Patient@123'),
        is_active: true,
      },
      $setOnInsert: { username: 'patient01' },
    },
    { upsert: true, returnDocument: 'after' },
  );

  await Promise.all([
    UserProfile.findOneAndUpdate(
      { user_id: adminUser._id },
      {
        $set: {
          full_name: 'System Admin',
          gender: 'other',
          phone: '0900000001',
          address: 'Ho Chi Minh City',
          nationality: 'Viet Nam',
        },
        $setOnInsert: { user_id: adminUser._id },
      },
      { upsert: true, returnDocument: 'after' },
    ),
    UserProfile.findOneAndUpdate(
      { user_id: doctorUser._id },
      {
        $set: {
          full_name: 'TS.BS Nguyen Van A',
          date_of_birth: new Date('1975-06-20'),
          gender: 'Nam',
          phone: '0912345678',
          address: '123 Le Loi, Q1, TP.HCM',
          nationality: 'Viet Nam',
          ethnicity: 'Kinh',
          image_url: '/avatars/a.jpg',
          cccd: '012345678901',
          cccd_issue_place: 'TP.HCM',
        },
        $setOnInsert: { user_id: doctorUser._id },
      },
      { upsert: true, returnDocument: 'after' },
    ),
    UserProfile.findOneAndUpdate(
      { user_id: patientUser._id },
      {
        $set: {
          full_name: 'Tran Thi B',
          gender: 'female',
          phone: '0900000003',
          address: 'Can Tho',
          nationality: 'Viet Nam',
          cccd: '079201002222',
          cccd_issue_place: 'Can Tho',
        },
        $setOnInsert: { user_id: patientUser._id },
      },
      { upsert: true, returnDocument: 'after' },
    ),
  ]);

  await Promise.all([
    UserRole.updateOne(
      { user_id: adminUser._id, role_id: adminRole._id },
      { $setOnInsert: { user_id: adminUser._id, role_id: adminRole._id } },
      { upsert: true },
    ),
    UserRole.updateOne(
      { user_id: doctorUser._id, role_id: doctorRole._id },
      { $setOnInsert: { user_id: doctorUser._id, role_id: doctorRole._id } },
      { upsert: true },
    ),
    UserRole.updateOne(
      { user_id: doctorUser._id, role_id: nurseRole._id },
      { $setOnInsert: { user_id: doctorUser._id, role_id: nurseRole._id } },
      { upsert: true },
    ),
    UserRole.updateOne(
      { user_id: patientUser._id, role_id: patientRole._id },
      { $setOnInsert: { user_id: patientUser._id, role_id: patientRole._id } },
      { upsert: true },
    ),
  ]);

  const doctorStaff = await Staff.findOneAndUpdate(
    { user_id: doctorUser._id },
    {
      $set: {
        department_id: internalDept._id,
        staff_code: 'NV001',
        position: 'Truong khoa',
      },
      $setOnInsert: { user_id: doctorUser._id },
    },
    { upsert: true, returnDocument: 'after' },
  );

  await Doctor.findOneAndUpdate(
    { staff_id: doctorStaff._id },
    {
      $set: {
        doctor_code: 'BS001',
        specialty: 'Tim mach',
        social_insurance: '123456789',
        professional_role: 'Bac si dieu tri',
        title: 'Truong khoa',
        introduction: 'Bac si co nhieu nam kinh nghiem trong kham va dieu tri benh tim mach.',
        treatment_scope: 'Kham tim mach, theo doi benh tang huyet ap, tu van va dieu tri noi khoa.',
        work_history: 'Cong tac tai benh vien tuyen trung uong va phu trach khoa noi tong quat.',
        achievements: 'Hoan thanh nhieu de tai chuyen mon va tham gia dao tao bac si tre.',
        attachments: [
          { name: 'So yeu ly lich.pdf', url: '/files/profile.pdf' },
          { name: 'Bang chuyen khoa II.jpg', url: '/files/bangck2.jpg' },
        ],
      },
      $setOnInsert: { staff_id: doctorStaff._id },
    },
    { upsert: true, returnDocument: 'after' },
  );

  await Staff.findOneAndUpdate(
    { user_id: adminUser._id },
    {
      $set: {
        department_id: cardioDept._id,
        position: 'Quan tri he thong',
      },
      $setOnInsert: { user_id: adminUser._id },
    },
    { upsert: true, returnDocument: 'after' },
  );

  const patient = await Patient.findOneAndUpdate(
    { user_id: patientUser._id },
    {
      $set: {
        patient_code: 'BN0001',
        social_insurance_no: 'BHXH-00001',
        patient_job: 'Nhan vien van phong',
        membership_type: 'standard',
      },
      $setOnInsert: { user_id: patientUser._id },
    },
    { upsert: true, returnDocument: 'after' },
  );

  const appointment = await Appointment.findOneAndUpdate(
    {
      staff_id: doctorStaff._id,
      patient_id: patient._id,
      work_date: new Date('2026-02-26'),
      start_time: '09:00',
    },
    {
      $set: {
        end_time: '09:30',
        type: 'online',
        room: 'ROOM-A1',
        status: 'confirmed',
        note: 'Tai kham dinh ky',
      },
      $setOnInsert: {
        staff_id: doctorStaff._id,
        patient_id: patient._id,
        work_date: new Date('2026-02-26'),
        start_time: '09:00',
      },
    },
    { upsert: true, returnDocument: 'after' },
  );

  const medicalRecord = await MedicalRecord.findOneAndUpdate(
    { appointment_id: appointment._id },
    {
      $set: {
        patient_id: patient._id,
        staff_id: doctorStaff._id,
        diagnosis: 'Tang huyet ap giai doan 1',
        conclusion: 'Theo doi tai nha, tai kham sau 2 tuan',
      },
      $setOnInsert: {
        appointment_id: appointment._id,
      },
    },
    { upsert: true, returnDocument: 'after' },
  );

  await Appointment.updateOne(
    { _id: appointment._id },
    { $set: { record_id: medicalRecord._id } },
  );

  await Vital.findOneAndUpdate(
    { record_id: medicalRecord._id, measured_at: new Date('2026-02-26T09:05:00Z') },
    {
      $set: {
        height_cm: 165,
        weight_kg: 60,
        temperature_c: 36.8,
        heart_rate: 84,
        blood_pressure: '140/90',
        respiratory_rate: 18,
        oxygen_saturation: 98,
        note: 'Chi so on dinh',
      },
      $setOnInsert: {
        record_id: medicalRecord._id,
        measured_at: new Date('2026-02-26T09:05:00Z'),
      },
    },
    { upsert: true, returnDocument: 'after' },
  );

  const amlodipine = await Drug.findOneAndUpdate(
    { drug_name: 'Amlodipine 5mg' },
    {
      $set: {
        unit: 'vien',
        stock: 500,
      },
      $setOnInsert: {
        drug_name: 'Amlodipine 5mg',
      },
    },
    { upsert: true, returnDocument: 'after' },
  );

  const prescription = await Prescription.findOneAndUpdate(
    { record_id: medicalRecord._id, start_date: new Date('2026-02-26') },
    {
      $set: {
        days: 14,
      },
      $setOnInsert: {
        record_id: medicalRecord._id,
        start_date: new Date('2026-02-26'),
      },
    },
    { upsert: true, returnDocument: 'after' },
  );

  await PrescriptionDetail.findOneAndUpdate(
    { prescription_id: prescription._id, drug_id: amlodipine._id, time_of_day: 'morning' },
    {
      $set: {
        unit: 'vien',
        quantity: 1,
        meal_timing: 'sau_an',
        note: 'Uong sau an sang',
      },
      $setOnInsert: {
        prescription_id: prescription._id,
        drug_id: amlodipine._id,
        time_of_day: 'morning',
      },
    },
    { upsert: true, returnDocument: 'after' },
  );

  console.log('Seed completed successfully');
  console.log('Mongo URI:', mongoUri);
  console.log('Demo accounts:');
  console.log('- admin / Admin@123');
  console.log('- doctor01 / Doctor@123');
  console.log('- patient01 / Patient@123');
}

runSeed()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
