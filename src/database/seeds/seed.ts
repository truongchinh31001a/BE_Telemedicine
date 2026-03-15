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
  const Schedule = models.get('Schedule')!;
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
          avatar:
            'https://images.pexels.com/photos/21073473/pexels-photo-21073473.jpeg?cs=srgb&dl=pexels-ratnawati-setiabudi-77751829-21073473.jpg&fm=jpg',
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
          avatar:
            'https://images.pexels.com/photos/7335565/pexels-photo-7335565.jpeg?cs=srgb&dl=pexels-supplier-gorden-ready-stok-minimalis-21695059-7335565.jpg&fm=jpg',
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

  const [neuroDept, pediDept, emergencyDept] = await Promise.all([
    Department.findOneAndUpdate(
      { department_name: 'Than kinh' },
      {
        $set: {
          department_name: 'Than kinh',
          department_code: 'TK001',
          room: 'P301',
          type: 'Chuyen khoa',
          phone: '02834567890',
          email: 'thankinh@hospital.vn',
          status: 'Hoat dong',
          avatar:
            'https://images.pexels.com/photos/11660582/pexels-photo-11660582.jpeg?cs=srgb&dl=pexels-printexstar-11660582.jpg&fm=jpg',
          description: 'Khoa Than kinh phu trach tham kham va dieu tri cac benh ly than kinh.',
          services: 'Kham than kinh, theo doi dot quy, tu van phuc hoi chuc nang.',
          functions: 'Chan doan va dieu tri cac roi loan than kinh trung uong va ngoai bien.',
          other_info: 'Co doi ngu bac si truc cap cuu 24/7.',
          attachments: [{ name: 'Huong dan khoa than kinh.pdf', url: '/files/departments/thankinh-guide.pdf' }],
          related_departments: [{ code: 'TM001', name: 'Tim mach' }],
        },
      },
      { upsert: true, returnDocument: 'after' },
    ),
    Department.findOneAndUpdate(
      { department_name: 'Nhi' },
      {
        $set: {
          department_name: 'Nhi',
          department_code: 'NHI001',
          room: 'P401',
          type: 'Lam sang',
          phone: '02845678901',
          email: 'nhi@hospital.vn',
          status: 'Hoat dong',
          avatar:
            'https://images.pexels.com/photos/21073473/pexels-photo-21073473.jpeg?cs=srgb&dl=pexels-ratnawati-setiabudi-77751829-21073473.jpg&fm=jpg',
          description: 'Khoa Nhi tiep nhan kham va dieu tri benh ly cho tre em.',
          services: 'Kham tong quat nhi, dinh duong, tiem chung, tu van phat trien.',
          functions: 'Theo doi suc khoe tre em va dieu tri cac benh ly nhi khoa.',
          other_info: 'Co khu vui choi cho be trong khu vuc cho kham.',
          attachments: [{ name: 'Cam nang khoa nhi.pdf', url: '/files/departments/nhi-handbook.pdf' }],
          related_departments: [{ code: 'KN001', name: 'Khoa Noi' }],
        },
      },
      { upsert: true, returnDocument: 'after' },
    ),
    Department.findOneAndUpdate(
      { department_name: 'Cap cuu' },
      {
        $set: {
          department_name: 'Cap cuu',
          department_code: 'CC001',
          room: 'P001',
          type: 'Cap cuu',
          phone: '02811112222',
          email: 'capcuu@hospital.vn',
          status: 'Hoat dong',
          avatar:
            'https://images.pexels.com/photos/263402/pexels-photo-263402.jpeg?cs=srgb&dl=pexels-pixabay-263402.jpg&fm=jpg',
          description: 'Khoa Cap cuu phu trach tiep nhan va xu tri cac truong hop khan cap.',
          services: 'Cap cuu noi khoa, ngoai khoa, hoi suc ban dau.',
          functions: 'Tiep nhan, sang loc va xu tri ca cap cuu 24/7.',
          other_info: 'Lien thong truc tiep voi cac khoa hoi suc va chan doan hinh anh.',
          attachments: [{ name: 'So do cap cuu.pdf', url: '/files/departments/capcuu-map.pdf' }],
          related_departments: [
            { code: 'TM001', name: 'Tim mach' },
            { code: 'TK001', name: 'Than kinh' },
          ],
        },
      },
      { upsert: true, returnDocument: 'after' },
    ),
  ]);

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
          image_url:
            'https://images.pexels.com/photos/6762862/pexels-photo-6762862.jpeg?cs=srgb&dl=pexels-usman-yousaf-708951-6762862.jpg&fm=jpg',
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

  const doctorSeeds = [
    {
      username: 'doctor02',
      email: 'doctor02@telemedicine.local',
      password: 'Doctor@123',
      full_name: 'TS.BS Le Thi B',
      date_of_birth: new Date('1980-03-18'),
      gender: 'Nu',
      phone: '0911111111',
      address: '45 Nguyen Hue, Q1, TP.HCM',
      nationality: 'Viet Nam',
      ethnicity: 'Kinh',
      image_url:
        'https://images.pexels.com/photos/5215024/pexels-photo-5215024.jpeg?cs=srgb&dl=pexels-shkrabaanthony-5215024.jpg&fm=jpg',
      cccd: '012345678902',
      cccd_issue_place: 'TP.HCM',
      staff_code: 'NV002',
      doctor_code: 'BS002',
      department_id: cardioDept._id,
      specialty: 'Tim mach',
      professional_role: 'Bac si chuyen khoa',
      title: 'Pho khoa',
      social_insurance: '223456789',
      introduction: 'Chuyen sau ve sieu am tim va dieu tri suy tim.',
      treatment_scope: 'Kham tim mach, hoi suc tim mach, tu van phong ngua benh mach vanh.',
      work_history: 'Tung cong tac tai trung tam tim mach lon va tham gia hoi chan lien vien.',
      achievements: 'Bao cao vien nhieu hoi nghi tim mach trong nuoc.',
      attachments: [{ name: 'Chung chi tim mach.pdf', url: '/files/doctors/bs002-cert.pdf' }],
    },
    {
      username: 'doctor03',
      email: 'doctor03@telemedicine.local',
      password: 'Doctor@123',
      full_name: 'BS Tran Quoc C',
      date_of_birth: new Date('1984-09-12'),
      gender: 'Nam',
      phone: '0912222222',
      address: '212 Cach Mang Thang 8, Q3, TP.HCM',
      nationality: 'Viet Nam',
      ethnicity: 'Kinh',
      image_url:
        'https://images.pexels.com/photos/32160037/pexels-photo-32160037.jpeg?cs=srgb&dl=pexels-konrads-photo-32160037.jpg&fm=jpg',
      cccd: '012345678903',
      cccd_issue_place: 'TP.HCM',
      staff_code: 'NV003',
      doctor_code: 'BS003',
      department_id: neuroDept._id,
      specialty: 'Than kinh',
      professional_role: 'Bac si dieu tri',
      title: 'Bac si chinh',
      social_insurance: '323456789',
      introduction: 'Theo doi benh dot quy, dau nua dau va roi loan than kinh.',
      treatment_scope: 'Chan doan va dieu tri cac benh ly than kinh noi tru va ngoai tru.',
      work_history: 'Phu trach phong kham than kinh va hoi chan cap cuu than kinh.',
      achievements: 'Tham gia xay dung quy trinh xu tri dot quy som.',
      attachments: [{ name: 'Bang tot nghiep.pdf', url: '/files/doctors/bs003-degree.pdf' }],
    },
    {
      username: 'doctor04',
      email: 'doctor04@telemedicine.local',
      password: 'Doctor@123',
      full_name: 'BS Pham Thu D',
      date_of_birth: new Date('1988-01-25'),
      gender: 'Nu',
      phone: '0913333333',
      address: '78 Phan Xich Long, Phu Nhuan, TP.HCM',
      nationality: 'Viet Nam',
      ethnicity: 'Kinh',
      image_url:
        'https://images.pexels.com/photos/8376318/pexels-photo-8376318.jpeg?cs=srgb&dl=pexels-tima-miroshnichenko-8376318.jpg&fm=jpg',
      cccd: '012345678904',
      cccd_issue_place: 'TP.HCM',
      staff_code: 'NV004',
      doctor_code: 'BS004',
      department_id: pediDept._id,
      specialty: 'Nhi khoa',
      professional_role: 'Bac si dieu tri',
      title: 'Bac si',
      social_insurance: '423456789',
      introduction: 'Co kinh nghiem trong tu van dinh duong va benh ly ho hap tre em.',
      treatment_scope: 'Kham benh nhi, theo doi dinh duong, cham soc suc khoe tre nho.',
      work_history: 'Lam viec tai khoa nhi tong quat va phong kham tiem chung.',
      achievements: 'Dat giai sang kien cai tien quy trinh tiep don nhi khoa.',
      attachments: [{ name: 'Ho so hanh nghe.pdf', url: '/files/doctors/bs004-license.pdf' }],
    },
    {
      username: 'doctor05',
      email: 'doctor05@telemedicine.local',
      password: 'Doctor@123',
      full_name: 'TS.BS Hoang Minh E',
      date_of_birth: new Date('1978-11-02'),
      gender: 'Nam',
      phone: '0914444444',
      address: '15 Vo Van Tan, Q3, TP.HCM',
      nationality: 'Viet Nam',
      ethnicity: 'Kinh',
      image_url:
        'https://images.pexels.com/photos/12660379/pexels-photo-12660379.jpeg?cs=srgb&dl=pexels-jrfotosgrand-fotografia-259137805-12660379.jpg&fm=jpg',
      cccd: '012345678905',
      cccd_issue_place: 'TP.HCM',
      staff_code: 'NV005',
      doctor_code: 'BS005',
      department_id: emergencyDept._id,
      specialty: 'Cap cuu',
      professional_role: 'Bac si truc cap cuu',
      title: 'Truong don vi',
      social_insurance: '523456789',
      introduction: 'Phu trach xu tri cap cuu noi khoa va hoi suc ban dau.',
      treatment_scope: 'Cap cuu tong quat, sang loc, hoi suc, chuyen khoa lien quan.',
      work_history: 'Nhieu nam phu trach khoa cap cuu va hoi suc ngoai vien.',
      achievements: 'Huong dan dao tao cap cuu cho nhieu nhom nhan vien y te.',
      attachments: [{ name: 'Chung chi ACLS.pdf', url: '/files/doctors/bs005-acls.pdf' }],
    },
  ];

  const doctorStaffMap = new Map<string, any>([[String(doctorUser._id), doctorStaff]]);

  for (const seed of doctorSeeds) {
    const seededUser = await User.findOneAndUpdate(
      { username: seed.username },
      {
        $set: {
          email: seed.email,
          password_hash: passwordHash(seed.password),
          is_active: true,
        },
        $setOnInsert: { username: seed.username },
      },
      { upsert: true, returnDocument: 'after' },
    );

    await UserProfile.findOneAndUpdate(
      { user_id: seededUser._id },
      {
        $set: {
          full_name: seed.full_name,
          date_of_birth: seed.date_of_birth,
          gender: seed.gender,
          phone: seed.phone,
          address: seed.address,
          nationality: seed.nationality,
          ethnicity: seed.ethnicity,
          image_url: seed.image_url,
          cccd: seed.cccd,
          cccd_issue_place: seed.cccd_issue_place,
        },
        $setOnInsert: { user_id: seededUser._id },
      },
      { upsert: true, returnDocument: 'after' },
    );

    await UserRole.updateOne(
      { user_id: seededUser._id, role_id: doctorRole._id },
      { $setOnInsert: { user_id: seededUser._id, role_id: doctorRole._id } },
      { upsert: true },
    );

    const seededStaff = await Staff.findOneAndUpdate(
      { user_id: seededUser._id },
      {
        $set: {
          department_id: seed.department_id,
          staff_code: seed.staff_code,
          position: seed.title,
        },
        $setOnInsert: { user_id: seededUser._id },
      },
      { upsert: true, returnDocument: 'after' },
    );

    await Doctor.findOneAndUpdate(
      { staff_id: seededStaff._id },
      {
        $set: {
          doctor_code: seed.doctor_code,
          specialty: seed.specialty,
          social_insurance: seed.social_insurance,
          professional_role: seed.professional_role,
          title: seed.title,
          introduction: seed.introduction,
          treatment_scope: seed.treatment_scope,
          work_history: seed.work_history,
          achievements: seed.achievements,
          attachments: seed.attachments,
        },
        $setOnInsert: { staff_id: seededStaff._id },
      },
      { upsert: true, returnDocument: 'after' },
    );

    doctorStaffMap.set(String(seededUser._id), seededStaff);
  }

  const patientSeeds = [
    {
      username: 'patient02',
      email: 'patient02@telemedicine.local',
      password: 'Patient@123',
      full_name: 'Nguyen Thi Lan',
      gender: 'Nu',
      phone: '0908000002',
      address: 'Bien Hoa, Dong Nai',
      nationality: 'Viet Nam',
      cccd: '079201002223',
      cccd_issue_place: 'Dong Nai',
      patient_code: 'BN0002',
      social_insurance_no: 'BHXH-00002',
      patient_job: 'Ke toan',
      membership_type: 'gold',
    },
    {
      username: 'patient03',
      email: 'patient03@telemedicine.local',
      password: 'Patient@123',
      full_name: 'Le Van Minh',
      gender: 'Nam',
      phone: '0908000003',
      address: 'Thu Duc, TP.HCM',
      nationality: 'Viet Nam',
      cccd: '079201002224',
      cccd_issue_place: 'TP.HCM',
      patient_code: 'BN0003',
      social_insurance_no: 'BHXH-00003',
      patient_job: 'Ky su',
      membership_type: 'standard',
    },
    {
      username: 'patient04',
      email: 'patient04@telemedicine.local',
      password: 'Patient@123',
      full_name: 'Pham Ngoc Anh',
      gender: 'Nu',
      phone: '0908000004',
      address: 'Da Nang',
      nationality: 'Viet Nam',
      cccd: '079201002225',
      cccd_issue_place: 'Da Nang',
      patient_code: 'BN0004',
      social_insurance_no: 'BHXH-00004',
      patient_job: 'Giao vien',
      membership_type: 'silver',
    },
    {
      username: 'patient05',
      email: 'patient05@telemedicine.local',
      password: 'Patient@123',
      full_name: 'Hoang Duc Long',
      gender: 'Nam',
      phone: '0908000005',
      address: 'Vung Tau',
      nationality: 'Viet Nam',
      cccd: '079201002226',
      cccd_issue_place: 'Ba Ria - Vung Tau',
      patient_code: 'BN0005',
      social_insurance_no: 'BHXH-00005',
      patient_job: 'Kinh doanh',
      membership_type: 'standard',
    },
  ];

  const patientMap = new Map<string, any>([[patient.patient_code, patient]]);

  for (const seed of patientSeeds) {
    const seededUser = await User.findOneAndUpdate(
      { username: seed.username },
      {
        $set: {
          email: seed.email,
          password_hash: passwordHash(seed.password),
          is_active: true,
        },
        $setOnInsert: { username: seed.username },
      },
      { upsert: true, returnDocument: 'after' },
    );

    await UserProfile.findOneAndUpdate(
      { user_id: seededUser._id },
      {
        $set: {
          full_name: seed.full_name,
          gender: seed.gender,
          phone: seed.phone,
          address: seed.address,
          nationality: seed.nationality,
          cccd: seed.cccd,
          cccd_issue_place: seed.cccd_issue_place,
        },
        $setOnInsert: { user_id: seededUser._id },
      },
      { upsert: true, returnDocument: 'after' },
    );

    await UserRole.updateOne(
      { user_id: seededUser._id, role_id: patientRole._id },
      { $setOnInsert: { user_id: seededUser._id, role_id: patientRole._id } },
      { upsert: true },
    );

    const seededPatient = await Patient.findOneAndUpdate(
      { user_id: seededUser._id },
      {
        $set: {
          patient_code: seed.patient_code,
          social_insurance_no: seed.social_insurance_no,
          patient_job: seed.patient_job,
          membership_type: seed.membership_type,
        },
        $setOnInsert: { user_id: seededUser._id },
      },
      { upsert: true, returnDocument: 'after' },
    );

    patientMap.set(seed.patient_code, seededPatient);
  }

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

  const [bisoprolol, paracetamol, vitaminC] = await Promise.all([
    Drug.findOneAndUpdate(
      { drug_name: 'Bisoprolol 2.5mg' },
      { $set: { unit: 'vien', stock: 320 }, $setOnInsert: { drug_name: 'Bisoprolol 2.5mg' } },
      { upsert: true, returnDocument: 'after' },
    ),
    Drug.findOneAndUpdate(
      { drug_name: 'Paracetamol 500mg' },
      { $set: { unit: 'vien', stock: 900 }, $setOnInsert: { drug_name: 'Paracetamol 500mg' } },
      { upsert: true, returnDocument: 'after' },
    ),
    Drug.findOneAndUpdate(
      { drug_name: 'Vitamin C 1000mg' },
      { $set: { unit: 'vien', stock: 450 }, $setOnInsert: { drug_name: 'Vitamin C 1000mg' } },
      { upsert: true, returnDocument: 'after' },
    ),
  ]);

  const appointmentSeeds = [
    {
      staff_id: [...doctorStaffMap.values()][1]._id,
      patient_id: patientMap.get('BN0002')._id,
      work_date: new Date('2026-03-01'),
      start_time: '08:00',
      end_time: '08:30',
      type: 'offline',
      room: 'TM-01',
      status: 'confirmed',
      note: 'Kham dau nguc va hoi hop',
      diagnosis: 'Nghi roi loan nhip tim',
      conclusion: 'Theo doi them va hen tai kham sau 7 ngay',
      vitals: { height_cm: 158, weight_kg: 52, temperature_c: 36.7, heart_rate: 92, blood_pressure: '135/85' },
      prescriptionDrug: bisoprolol,
    },
    {
      staff_id: [...doctorStaffMap.values()][2]._id,
      patient_id: patientMap.get('BN0003')._id,
      work_date: new Date('2026-03-02'),
      start_time: '09:30',
      end_time: '10:00',
      type: 'online',
      room: 'TK-02',
      status: 'confirmed',
      note: 'Dau dau keo dai',
      diagnosis: 'Dau nua dau',
      conclusion: 'Theo doi tai nha, giam thoi gian man hinh',
      vitals: { height_cm: 172, weight_kg: 68, temperature_c: 36.5, heart_rate: 76, blood_pressure: '120/80' },
      prescriptionDrug: paracetamol,
    },
    {
      staff_id: [...doctorStaffMap.values()][3]._id,
      patient_id: patientMap.get('BN0004')._id,
      work_date: new Date('2026-03-03'),
      start_time: '14:00',
      end_time: '14:30',
      type: 'offline',
      room: 'NHI-03',
      status: 'confirmed',
      note: 'Tre sot nhe, ho',
      diagnosis: 'Viem hong cap',
      conclusion: 'Uong nhieu nuoc, theo doi nhiet do',
      vitals: { height_cm: 120, weight_kg: 24, temperature_c: 37.6, heart_rate: 98, blood_pressure: '100/65' },
      prescriptionDrug: vitaminC,
    },
    {
      staff_id: [...doctorStaffMap.values()][4]._id,
      patient_id: patientMap.get('BN0005')._id,
      work_date: new Date('2026-03-04'),
      start_time: '20:00',
      end_time: '20:30',
      type: 'offline',
      room: 'CC-01',
      status: 'confirmed',
      note: 'Kho tho nhe ve dem',
      diagnosis: 'Theo doi hen phe quan',
      conclusion: 'Can danh gia them chuc nang ho hap',
      vitals: { height_cm: 170, weight_kg: 73, temperature_c: 36.9, heart_rate: 88, blood_pressure: '128/82' },
      prescriptionDrug: paracetamol,
    },
  ];

  for (const seed of appointmentSeeds) {
    const seededAppointment = await Appointment.findOneAndUpdate(
      {
        staff_id: seed.staff_id,
        patient_id: seed.patient_id,
        work_date: seed.work_date,
        start_time: seed.start_time,
      },
      {
        $set: {
          end_time: seed.end_time,
          type: seed.type,
          room: seed.room,
          status: seed.status,
          note: seed.note,
        },
        $setOnInsert: {
          staff_id: seed.staff_id,
          patient_id: seed.patient_id,
          work_date: seed.work_date,
          start_time: seed.start_time,
        },
      },
      { upsert: true, returnDocument: 'after' },
    );

    const seededRecord = await MedicalRecord.findOneAndUpdate(
      { appointment_id: seededAppointment._id },
      {
        $set: {
          patient_id: seed.patient_id,
          staff_id: seed.staff_id,
          diagnosis: seed.diagnosis,
          conclusion: seed.conclusion,
        },
        $setOnInsert: { appointment_id: seededAppointment._id },
      },
      { upsert: true, returnDocument: 'after' },
    );

    await Appointment.updateOne(
      { _id: seededAppointment._id },
      { $set: { record_id: seededRecord._id } },
    );

    await Vital.findOneAndUpdate(
      { record_id: seededRecord._id, measured_at: seed.work_date },
      {
        $set: {
          ...seed.vitals,
          respiratory_rate: 18,
          oxygen_saturation: 98,
          note: 'Chi so theo doi tai buoi kham',
        },
        $setOnInsert: {
          record_id: seededRecord._id,
          measured_at: seed.work_date,
        },
      },
      { upsert: true, returnDocument: 'after' },
    );

    const seededPrescription = await Prescription.findOneAndUpdate(
      { record_id: seededRecord._id, start_date: seed.work_date },
      {
        $set: { days: 5 },
        $setOnInsert: { record_id: seededRecord._id, start_date: seed.work_date },
      },
      { upsert: true, returnDocument: 'after' },
    );

    await PrescriptionDetail.findOneAndUpdate(
      {
        prescription_id: seededPrescription._id,
        drug_id: seed.prescriptionDrug._id,
        time_of_day: 'morning',
      },
      {
        $set: {
          unit: 'vien',
          quantity: 1,
          meal_timing: 'sau_an',
          note: 'Su dung theo huong dan bac si',
        },
        $setOnInsert: {
          prescription_id: seededPrescription._id,
          drug_id: seed.prescriptionDrug._id,
          time_of_day: 'morning',
        },
      },
      { upsert: true, returnDocument: 'after' },
    );
  }

  const scheduleSeeds = [
    { department_id: internalDept._id, event_name: 'Ca sang', event_type: 'Kham', work_date: new Date('2026-03-05'), start_time: '07:30', end_time: '11:30', room: 'P101', note: 'Lich kham sang khoa noi' },
    { department_id: cardioDept._id, event_name: 'Ca chieu', event_type: 'Kham', work_date: new Date('2026-03-05'), start_time: '13:30', end_time: '17:00', room: 'P201', note: 'Lich kham tim mach' },
    { department_id: neuroDept._id, event_name: 'Hoi chan', event_type: 'Hoi chan', work_date: new Date('2026-03-06'), start_time: '09:00', end_time: '10:30', room: 'P301', note: 'Hoi chan ca benh dot quy' },
    { department_id: pediDept._id, event_name: 'Tu van dinh duong', event_type: 'Tu van', work_date: new Date('2026-03-06'), start_time: '14:00', end_time: '16:00', room: 'P401', note: 'Tu van cho phu huynh' },
  ];

  for (const seed of scheduleSeeds) {
    await Schedule.findOneAndUpdate(
      {
        department_id: seed.department_id,
        event_name: seed.event_name,
        work_date: seed.work_date,
        start_time: seed.start_time,
      },
      {
        $set: {
          event_type: seed.event_type,
          end_time: seed.end_time,
          room: seed.room,
          note: seed.note,
        },
        $setOnInsert: {
          department_id: seed.department_id,
          event_name: seed.event_name,
          work_date: seed.work_date,
          start_time: seed.start_time,
        },
      },
      { upsert: true, returnDocument: 'after' },
    );
  }

  console.log('Seed completed successfully');
  console.log('Mongo URI:', mongoUri);
  console.log('Demo accounts:');
  console.log('- admin / Admin@123');
  console.log('- doctor01 / Doctor@123');
  console.log('- doctor02 / Doctor@123');
  console.log('- doctor03 / Doctor@123');
  console.log('- doctor04 / Doctor@123');
  console.log('- doctor05 / Doctor@123');
  console.log('- patient01 / Patient@123');
  console.log('- patient02 / Patient@123');
  console.log('- patient03 / Patient@123');
  console.log('- patient04 / Patient@123');
  console.log('- patient05 / Patient@123');
}

runSeed()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
