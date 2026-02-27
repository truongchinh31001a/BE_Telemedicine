import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { idText, pickAlias, requireObjectId, toIsoDate } from './common/alias.util';

@Injectable()
export class MasterDataService {
  constructor(
    @InjectModel('Department') private readonly departmentModel: Model<any>,
    @InjectModel('Staff') private readonly staffModel: Model<any>,
    @InjectModel('User') private readonly userModel: Model<any>,
    @InjectModel('UserProfile') private readonly userProfileModel: Model<any>,
    @InjectModel('UserRole') private readonly userRoleModel: Model<any>,
    @InjectModel('Role') private readonly roleModel: Model<any>,
    @InjectModel('Patient') private readonly patientModel: Model<any>,
    @InjectModel('Drug') private readonly drugModel: Model<any>,
  ) {}

  async getDepartments() {
    const departments = await this.departmentModel.find().sort({ department_name: 1 }).lean();
    return departments.map((item: any) => ({
      departmentId: idText(item),
      departmentName: item.department_name,
    }));
  }

  async getStaffList() {
    const staffs = await this.staffModel.find().lean();
    const userIds = staffs.map((item: any) => item.user_id);
    const profiles = await this.userProfileModel.find({ user_id: { $in: userIds } }).lean();
    const profileMap = new Map(profiles.map((item: any) => [String(item.user_id), item]));

    return staffs.map((item: any) => {
      const profile = profileMap.get(String(item.user_id));
      return {
        staffId: idText(item),
        fullName: profile?.full_name ?? '',
        image: profile?.image_url ?? '',
      };
    });
  }

  async getStaffDetail(id: string) {
    const staff = await this.staffModel.findById(requireObjectId(id, 'id')).lean();
    if (!staff) throw new NotFoundException('Staff not found');

    const [user, profile, department, userRole] = await Promise.all([
      this.userModel.findById(staff.user_id).lean(),
      this.userProfileModel.findOne({ user_id: staff.user_id }).lean(),
      this.departmentModel.findById(staff.department_id).lean(),
      this.userRoleModel.findOne({ user_id: staff.user_id }).lean(),
    ]);

    const role = userRole ? await this.roleModel.findById(userRole.role_id).lean() : null;

    return {
      staffId: idText(staff),
      username: user?.username ?? '',
      email: user?.email ?? '',
      fullName: profile?.full_name ?? '',
      dateOfBirth: profile?.date_of_birth ?? null,
      phone: profile?.phone ?? '',
      address: profile?.address ?? '',
      gender: profile?.gender ?? '',
      cccd: profile?.cccd ?? '',
      cccdIssueDate: profile?.cccd_issue_date ?? null,
      cccdIssuePlace: profile?.cccd_issue_place ?? '',
      cccdExpiredDate: profile?.cccd_expired_date ?? null,
      position: staff.position ?? '',
      roleName: role?.role_name ?? 'staff',
      departmentName: department?.department_name ?? '',
      ethnicity: profile?.ethnicity ?? '',
      nationality: profile?.nationality ?? '',
      image: profile?.image_url ?? '',
    };
  }

  async createStaff(payload: Record<string, unknown>) {
    const username = pickAlias<string>(payload, ['username']);
    const email = pickAlias<string>(payload, ['email']);
    const password = pickAlias<string>(payload, ['password', 'passwordHash', 'password_hash']) ?? '123456';
    const fullName = pickAlias<string>(payload, ['fullName', 'full_name']);
    const departmentId = pickAlias<string>(payload, ['departmentId', 'department_id']);

    if (!username || !email || !fullName || !departmentId) {
      throw new BadRequestException('username, email, fullName, departmentId are required');
    }

    const user = await this.userModel.create({
      username,
      email,
      password_hash: String(password),
      is_active: true,
    });

    await this.userProfileModel.create({
      user_id: user._id,
      full_name: fullName,
      date_of_birth: pickAlias(payload, ['dateOfBirth', 'date_of_birth'])
        ? toIsoDate(pickAlias(payload, ['dateOfBirth', 'date_of_birth']), 'dateOfBirth')
        : undefined,
      gender: pickAlias(payload, ['gender']),
      phone: pickAlias(payload, ['phone']),
      address: pickAlias(payload, ['address']),
      hometown: pickAlias(payload, ['hometown']),
      cccd: pickAlias(payload, ['cccd']),
      cccd_issue_date: pickAlias(payload, ['cccdIssueDate', 'cccd_issue_date'])
        ? toIsoDate(pickAlias(payload, ['cccdIssueDate', 'cccd_issue_date']), 'cccdIssueDate')
        : undefined,
      cccd_issue_place: pickAlias(payload, ['cccdIssuePlace', 'cccd_issue_place']),
      cccd_expired_date: pickAlias(payload, ['cccdExpiredDate', 'cccd_expired_date'])
        ? toIsoDate(pickAlias(payload, ['cccdExpiredDate', 'cccd_expired_date']), 'cccdExpiredDate')
        : undefined,
      ethnicity: pickAlias(payload, ['ethnicity']),
      nationality: pickAlias(payload, ['nationality']),
      image_url: pickAlias(payload, ['image', 'imageUrl', 'image_url']),
    });

    const staff = await this.staffModel.create({
      user_id: user._id,
      department_id: requireObjectId(departmentId, 'departmentId'),
      position: pickAlias(payload, ['position']),
    });

    let role = await this.roleModel.findOne({ role_name: 'staff' }).lean();
    if (!role) {
      role = await this.roleModel.create({ role_name: 'staff' });
    }
    await this.userRoleModel.updateOne(
      { user_id: user._id, role_id: role._id },
      { $setOnInsert: { user_id: user._id, role_id: role._id } },
      { upsert: true },
    );

    return { staffId: idText(staff), userId: idText(user) };
  }

  async updateStaff(staffId: string, payload: Record<string, unknown>) {
    const staff = await this.staffModel.findById(requireObjectId(staffId, 'staffId')).lean();
    if (!staff) throw new NotFoundException('Staff not found');

    const userSet: Record<string, unknown> = {};
    const email = pickAlias(payload, ['email']);
    const username = pickAlias(payload, ['username']);
    const isActive = pickAlias(payload, ['isActive', 'is_active']);
    if (email) userSet.email = email;
    if (username) userSet.username = username;
    if (isActive !== undefined) userSet.is_active = isActive;
    if (Object.keys(userSet).length) {
      await this.userModel.updateOne({ _id: staff.user_id }, { $set: userSet });
    }

    const profileSet: Record<string, unknown> = {};
    const mapping: Array<[string[], string]> = [
      [['fullName', 'full_name'], 'full_name'],
      [['gender'], 'gender'],
      [['phone'], 'phone'],
      [['address'], 'address'],
      [['hometown'], 'hometown'],
      [['cccd'], 'cccd'],
      [['cccdIssuePlace', 'cccd_issue_place'], 'cccd_issue_place'],
      [['ethnicity'], 'ethnicity'],
      [['nationality'], 'nationality'],
      [['image', 'imageUrl', 'image_url'], 'image_url'],
    ];
    mapping.forEach(([aliases, target]) => {
      const value = pickAlias(payload, aliases);
      if (value !== undefined) profileSet[target] = value;
    });

    const dob = pickAlias(payload, ['dateOfBirth', 'date_of_birth']);
    if (dob !== undefined) profileSet.date_of_birth = toIsoDate(dob, 'dateOfBirth');
    const issueDate = pickAlias(payload, ['cccdIssueDate', 'cccd_issue_date']);
    if (issueDate !== undefined) profileSet.cccd_issue_date = toIsoDate(issueDate, 'cccdIssueDate');
    const expiredDate = pickAlias(payload, ['cccdExpiredDate', 'cccd_expired_date']);
    if (expiredDate !== undefined)
      profileSet.cccd_expired_date = toIsoDate(expiredDate, 'cccdExpiredDate');

    if (Object.keys(profileSet).length) {
      await this.userProfileModel.updateOne(
        { user_id: staff.user_id },
        { $set: profileSet, $setOnInsert: { user_id: staff.user_id } },
        { upsert: true },
      );
    }

    const departmentId = pickAlias(payload, ['departmentId', 'department_id']);
    const staffSet: Record<string, unknown> = {};
    if (departmentId) staffSet.department_id = requireObjectId(departmentId, 'departmentId');
    const position = pickAlias(payload, ['position']);
    if (position !== undefined) staffSet.position = position;

    if (Object.keys(staffSet).length) {
      await this.staffModel.updateOne({ _id: staff._id }, { $set: staffSet });
    }

    return { success: true };
  }

  async getPatients() {
    const patients = await this.patientModel.find().lean();
    const userIds = patients.map((item: any) => item.user_id);
    const profiles = await this.userProfileModel.find({ user_id: { $in: userIds } }).lean();
    const profileMap = new Map(profiles.map((item: any) => [String(item.user_id), item]));

    return patients.map((item: any) => {
      const profile = profileMap.get(String(item.user_id));
      return {
        patientId: idText(item),
        fullName: profile?.full_name ?? '',
        image: profile?.image_url ?? '',
      };
    });
  }

  async getPatientDetail(id: string) {
    const patient = await this.patientModel.findById(requireObjectId(id, 'id')).lean();
    if (!patient) throw new NotFoundException('Patient not found');

    const profile = await this.userProfileModel.findOne({ user_id: patient.user_id }).lean();

    return {
      userInfoId: profile ? idText(profile) : null,
      patientId: idText(patient),
      fullName: profile?.full_name ?? '',
      dateOfBirth: profile?.date_of_birth ?? null,
      phone: profile?.phone ?? '',
      address: profile?.address ?? '',
      gender: profile?.gender ?? '',
      patientJob: patient.patient_job ?? '',
      cccd: profile?.cccd ?? '',
      cccdIssueDate: profile?.cccd_issue_date ?? null,
      cccdIssuePlace: profile?.cccd_issue_place ?? '',
      cccdExpiredDate: profile?.cccd_expired_date ?? null,
      ethnicity: profile?.ethnicity ?? '',
      nationality: profile?.nationality ?? '',
      hometown: profile?.hometown ?? '',
      image: profile?.image_url ?? '',
      cccdFront: profile?.cccd_front_url ?? '',
      cccdBack: profile?.cccd_back_url ?? '',
    };
  }

  async createPatient(payload: Record<string, unknown>) {
    const username = pickAlias<string>(payload, ['username']);
    const email = pickAlias<string>(payload, ['email']);
    const fullName = pickAlias<string>(payload, ['fullName', 'full_name']);
    const patientCode = pickAlias<string>(payload, ['patientCode', 'patient_code']);

    if (!username || !email || !fullName || !patientCode) {
      throw new BadRequestException('username, email, fullName, patientCode are required');
    }

    const user = await this.userModel.create({
      username,
      email,
      password_hash: String(pickAlias(payload, ['password', 'passwordHash', 'password_hash']) ?? '123456'),
      is_active: true,
    });

    await this.userProfileModel.create({
      user_id: user._id,
      full_name: fullName,
      date_of_birth: pickAlias(payload, ['dateOfBirth', 'date_of_birth'])
        ? toIsoDate(pickAlias(payload, ['dateOfBirth', 'date_of_birth']), 'dateOfBirth')
        : undefined,
      gender: pickAlias(payload, ['gender']),
      phone: pickAlias(payload, ['phone']),
      address: pickAlias(payload, ['address']),
      hometown: pickAlias(payload, ['hometown']),
      cccd: pickAlias(payload, ['cccd']),
      cccd_issue_date: pickAlias(payload, ['cccdIssueDate', 'cccd_issue_date'])
        ? toIsoDate(pickAlias(payload, ['cccdIssueDate', 'cccd_issue_date']), 'cccdIssueDate')
        : undefined,
      cccd_issue_place: pickAlias(payload, ['cccdIssuePlace', 'cccd_issue_place']),
      cccd_expired_date: pickAlias(payload, ['cccdExpiredDate', 'cccd_expired_date'])
        ? toIsoDate(pickAlias(payload, ['cccdExpiredDate', 'cccd_expired_date']), 'cccdExpiredDate')
        : undefined,
      ethnicity: pickAlias(payload, ['ethnicity']),
      nationality: pickAlias(payload, ['nationality']),
      image_url: pickAlias(payload, ['image', 'imageUrl', 'image_url']),
      cccd_front_url: pickAlias(payload, ['cccdFront', 'cccd_front_url', 'cccd_front']),
      cccd_back_url: pickAlias(payload, ['cccdBack', 'cccd_back_url', 'cccd_back']),
    });

    const patient = await this.patientModel.create({
      user_id: user._id,
      patient_code: patientCode,
      social_insurance_no: pickAlias(payload, ['socialInsuranceNo', 'social_insurance_no']),
      patient_job: pickAlias(payload, ['patientJob', 'patient_job']),
      membership_type: pickAlias(payload, ['membershipType', 'membership_type']),
    });

    const patientRole = await this.roleModel.findOneAndUpdate(
      { role_name: 'patient' },
      { $setOnInsert: { role_name: 'patient' } },
      { upsert: true, returnDocument: 'after' },
    );

    await this.userRoleModel.updateOne(
      { user_id: user._id, role_id: patientRole._id },
      { $setOnInsert: { user_id: user._id, role_id: patientRole._id } },
      { upsert: true },
    );

    return { patientId: idText(patient), userId: idText(user) };
  }

  async updatePatient(patientId: string, payload: Record<string, unknown>) {
    const patient = await this.patientModel.findById(requireObjectId(patientId, 'patientId')).lean();
    if (!patient) throw new NotFoundException('Patient not found');

    const userSet: Record<string, unknown> = {};
    const email = pickAlias(payload, ['email']);
    const username = pickAlias(payload, ['username']);
    const isActive = pickAlias(payload, ['isActive', 'is_active']);
    if (email) userSet.email = email;
    if (username) userSet.username = username;
    if (isActive !== undefined) userSet.is_active = isActive;
    if (Object.keys(userSet).length) {
      await this.userModel.updateOne({ _id: patient.user_id }, { $set: userSet });
    }

    const patientSet: Record<string, unknown> = {};
    const mapping: Array<[string[], string]> = [
      [['patientCode', 'patient_code'], 'patient_code'],
      [['socialInsuranceNo', 'social_insurance_no'], 'social_insurance_no'],
      [['patientJob', 'patient_job'], 'patient_job'],
      [['membershipType', 'membership_type'], 'membership_type'],
    ];
    mapping.forEach(([aliases, target]) => {
      const value = pickAlias(payload, aliases);
      if (value !== undefined) patientSet[target] = value;
    });
    if (Object.keys(patientSet).length) {
      await this.patientModel.updateOne({ _id: patient._id }, { $set: patientSet });
    }

    const profileSet: Record<string, unknown> = {};
    const profileMapping: Array<[string[], string]> = [
      [['fullName', 'full_name'], 'full_name'],
      [['gender'], 'gender'],
      [['phone'], 'phone'],
      [['address'], 'address'],
      [['hometown'], 'hometown'],
      [['cccd'], 'cccd'],
      [['cccdIssuePlace', 'cccd_issue_place'], 'cccd_issue_place'],
      [['ethnicity'], 'ethnicity'],
      [['nationality'], 'nationality'],
      [['image', 'imageUrl', 'image_url'], 'image_url'],
      [['cccdFront', 'cccd_front_url', 'cccd_front'], 'cccd_front_url'],
      [['cccdBack', 'cccd_back_url', 'cccd_back'], 'cccd_back_url'],
    ];
    profileMapping.forEach(([aliases, target]) => {
      const value = pickAlias(payload, aliases);
      if (value !== undefined) profileSet[target] = value;
    });
    const dob = pickAlias(payload, ['dateOfBirth', 'date_of_birth']);
    if (dob !== undefined) profileSet.date_of_birth = toIsoDate(dob, 'dateOfBirth');
    const issueDate = pickAlias(payload, ['cccdIssueDate', 'cccd_issue_date']);
    if (issueDate !== undefined) profileSet.cccd_issue_date = toIsoDate(issueDate, 'cccdIssueDate');
    const expiredDate = pickAlias(payload, ['cccdExpiredDate', 'cccd_expired_date']);
    if (expiredDate !== undefined)
      profileSet.cccd_expired_date = toIsoDate(expiredDate, 'cccdExpiredDate');

    if (Object.keys(profileSet).length) {
      await this.userProfileModel.updateOne(
        { user_id: patient.user_id },
        { $set: profileSet, $setOnInsert: { user_id: patient.user_id } },
        { upsert: true },
      );
    }

    return { success: true };
  }

  async getDrugList() {
    const drugs = await this.drugModel.find().sort({ drug_name: 1 }).lean();
    return drugs.map((item: any) => ({
      drugId: idText(item),
      drugName: item.drug_name,
      unit: item.unit,
      stock: item.stock,
    }));
  }

  async createDrug(payload: Record<string, unknown>) {
    const drugName = pickAlias(payload, ['drugName', 'drug_name']);
    if (!drugName) throw new BadRequestException('drugName is required');
    const drug = await this.drugModel.create({
      drug_name: String(drugName),
      unit: pickAlias(payload, ['unit']),
      stock: Number(pickAlias(payload, ['stock'], 0)),
    });
    return {
      drugId: idText(drug),
      drugName: drug.drug_name,
      unit: drug.unit,
      stock: drug.stock,
    };
  }
}
