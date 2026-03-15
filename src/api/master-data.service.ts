import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { idText, pickAlias, requireObjectId, toIsoDate } from './common/alias.util';

@Injectable()
export class MasterDataService {
  constructor(
    @InjectModel('Department') private readonly departmentModel: Model<any>,
    @InjectModel('Staff') private readonly staffModel: Model<any>,
    @InjectModel('Doctor') private readonly doctorModel: Model<any>,
    @InjectModel('User') private readonly userModel: Model<any>,
    @InjectModel('UserProfile') private readonly userProfileModel: Model<any>,
    @InjectModel('UserRole') private readonly userRoleModel: Model<any>,
    @InjectModel('Role') private readonly roleModel: Model<any>,
    @InjectModel('Patient') private readonly patientModel: Model<any>,
    @InjectModel('Drug') private readonly drugModel: Model<any>,
  ) {}

  private async enrichDepartments(departments: any[]) {
    const departmentIds = departments.map((item: any) => item._id);
    const staffs = await this.staffModel.find({ department_id: { $in: departmentIds } }).lean();
    const staffIds = staffs.map((item: any) => item._id);
    const userIds = staffs.map((item: any) => item.user_id);
    const [doctors, profiles] = await Promise.all([
      this.doctorModel.find({ staff_id: { $in: staffIds } }).lean(),
      this.userProfileModel.find({ user_id: { $in: userIds } }).lean(),
    ]);

    const doctorMap = new Map(doctors.map((item: any) => [String(item.staff_id), item]));
    const profileMap = new Map(profiles.map((item: any) => [String(item.user_id), item]));
    const membersByDepartment = new Map<string, any[]>();

    staffs.forEach((staff: any) => {
      const doctor = doctorMap.get(String(staff._id));
      const profile = profileMap.get(String(staff.user_id));
      const departmentKey = String(staff.department_id);
      const members = membersByDepartment.get(departmentKey) ?? [];
      members.push({
        id: doctor ? idText(doctor) : idText(staff),
        name: profile?.full_name ?? '',
        role: doctor?.title ?? staff.position ?? '',
        avatar: profile?.image_url ?? '',
      });
      membersByDepartment.set(departmentKey, members);
    });

    return departments.map((item: any) => ({
      departmentId: idText(item),
      departmentName: item.department_name,
      departmentCode: item.department_code ?? '',
      room: item.room ?? '',
      type: item.type ?? '',
      phone: item.phone ?? '',
      email: item.email ?? '',
      status: item.status ?? '',
      avatar: item.avatar ?? '',
      description: item.description ?? '',
      services: item.services ?? '',
      functions: item.functions ?? '',
      otherInfo: item.other_info ?? '',
      attachments: item.attachments ?? [],
      members: membersByDepartment.get(String(item._id)) ?? [],
      relatedDepartments: (item.related_departments ?? []).map((department: any) => ({
        code: department.code ?? '',
        name: department.name ?? '',
      })),
    }));
  }

  async getDepartments(query: Record<string, unknown> = {}) {
    const filter: Record<string, unknown> = {};
    const departmentCode = pickAlias<string>(query, ['departmentCode', 'department_code']);
    const type = pickAlias<string>(query, ['type']);
    const status = pickAlias<string>(query, ['status']);
    const keyword = String(pickAlias(query, ['keyword', 'q'], '') ?? '').trim();

    if (departmentCode) filter.department_code = departmentCode;
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (keyword) {
      filter.$or = [
        { department_name: { $regex: keyword, $options: 'i' } },
        { department_code: { $regex: keyword, $options: 'i' } },
        { phone: { $regex: keyword, $options: 'i' } },
        { email: { $regex: keyword, $options: 'i' } },
      ];
    }

    const departments = await this.departmentModel.find(filter).sort({ department_name: 1 }).lean();
    return this.enrichDepartments(departments);
  }

  async getDepartmentDetail(id: string) {
    const department = await this.departmentModel
      .findById(requireObjectId(id, 'id'))
      .lean();
    if (!department) throw new NotFoundException('Department not found');
    const [result] = await this.enrichDepartments([department]);
    return result;
  }

  async createDepartment(payload: Record<string, unknown>) {
    const departmentName = pickAlias<string>(payload, ['departmentName', 'department_name']);
    if (!departmentName) {
      throw new BadRequestException('departmentName is required');
    }

    const department = await this.departmentModel.create({
      department_name: departmentName,
      department_code: pickAlias(payload, ['departmentCode', 'department_code']),
      room: pickAlias(payload, ['room']),
      type: pickAlias(payload, ['type']),
      phone: pickAlias(payload, ['phone']),
      email: pickAlias(payload, ['email']),
      status: pickAlias(payload, ['status']),
      avatar: pickAlias(payload, ['avatar']),
      description: pickAlias(payload, ['description']),
      services: pickAlias(payload, ['services']),
      functions: pickAlias(payload, ['functions']),
      other_info: pickAlias(payload, ['otherInfo', 'other_info']),
      attachments: this.normalizeAttachments(
        pickAlias(payload, ['attachments'], []),
        'attachments',
      ),
      related_departments: this.normalizeRelatedDepartments(
        pickAlias(payload, ['relatedDepartments', 'related_departments'], []),
        'relatedDepartments',
      ),
    });

    const [result] = await this.enrichDepartments([department.toObject()]);
    return result;
  }

  async updateDepartment(departmentId: string, payload: Record<string, unknown>) {
    const department = await this.departmentModel
      .findById(requireObjectId(departmentId, 'departmentId'))
      .lean();
    if (!department) throw new NotFoundException('Department not found');

    const updateSet: Record<string, unknown> = {};
    const mapping: Array<[string[], string]> = [
      [['departmentName', 'department_name'], 'department_name'],
      [['departmentCode', 'department_code'], 'department_code'],
      [['room'], 'room'],
      [['type'], 'type'],
      [['phone'], 'phone'],
      [['email'], 'email'],
      [['status'], 'status'],
      [['avatar'], 'avatar'],
      [['description'], 'description'],
      [['services'], 'services'],
      [['functions'], 'functions'],
      [['otherInfo', 'other_info'], 'other_info'],
    ];

    mapping.forEach(([aliases, target]) => {
      const value = pickAlias(payload, aliases);
      if (value !== undefined) updateSet[target] = value;
    });

    const attachments = pickAlias(payload, ['attachments']);
    if (attachments !== undefined) {
      updateSet.attachments = this.normalizeAttachments(attachments, 'attachments');
    }

    const relatedDepartments = pickAlias(payload, ['relatedDepartments', 'related_departments']);
    if (relatedDepartments !== undefined) {
      updateSet.related_departments = this.normalizeRelatedDepartments(
        relatedDepartments,
        'relatedDepartments',
      );
    }

    if (!Object.keys(updateSet).length) {
      const [result] = await this.enrichDepartments([department]);
      return result;
    }

    const updatedDepartment = await this.departmentModel
      .findByIdAndUpdate(department._id, { $set: updateSet }, { new: true })
      .lean();

    const [result] = await this.enrichDepartments([updatedDepartment]);
    return result;
  }

  private normalizeAttachments(value: unknown, fieldName: string) {
    if (!Array.isArray(value)) {
      throw new BadRequestException(`${fieldName} must be an array`);
    }

    return value.map((item: unknown) => {
      if (!item || typeof item !== 'object') {
        throw new BadRequestException(`${fieldName} items must be objects`);
      }
      const attachment = item as Record<string, unknown>;
      return {
        name: String(attachment.name ?? ''),
        url: String(attachment.url ?? ''),
      };
    });
  }

  private normalizeRelatedDepartments(value: unknown, fieldName: string) {
    if (!Array.isArray(value)) {
      throw new BadRequestException(`${fieldName} must be an array`);
    }

    return value.map((item: unknown) => {
      if (!item || typeof item !== 'object') {
        throw new BadRequestException(`${fieldName} items must be objects`);
      }
      const relatedDepartment = item as Record<string, unknown>;
      return {
        code: String(relatedDepartment.code ?? ''),
        name: String(relatedDepartment.name ?? ''),
      };
    });
  }

  private async buildDoctorSummaries(doctors: any[]) {
    const staffIds = doctors.map((item: any) => item.staff_id);
    const staffs = await this.staffModel.find({ _id: { $in: staffIds } }).lean();
    const userIds = staffs.map((item: any) => item.user_id);
    const departmentIds = staffs.map((item: any) => item.department_id);
    const [profiles, users, departments] = await Promise.all([
      this.userProfileModel.find({ user_id: { $in: userIds } }).lean(),
      this.userModel.find({ _id: { $in: userIds } }).lean(),
      this.departmentModel.find({ _id: { $in: departmentIds } }).lean(),
    ]);

    const staffMap = new Map(staffs.map((item: any) => [String(item._id), item]));
    const profileMap = new Map(profiles.map((item: any) => [String(item.user_id), item]));
    const userMap = new Map(users.map((item: any) => [String(item._id), item]));
    const departmentMap = new Map(departments.map((item: any) => [String(item._id), item]));

    return doctors
      .map((item: any) => {
        const staff = staffMap.get(String(item.staff_id));
        if (!staff) return null;

        const profile = profileMap.get(String(staff.user_id));
        const user = userMap.get(String(staff.user_id));
        const department = departmentMap.get(String(staff.department_id));

        return {
          doctorId: idText(item),
          staffId: idText(staff),
          userId: user ? idText(user) : null,
          fullName: profile?.full_name ?? '',
          avatar: profile?.image_url ?? '',
          specialty: item.specialty ?? '',
          doctorCode: item.doctor_code ?? '',
          professionalRole: item.professional_role ?? '',
          title: item.title ?? '',
          phone: profile?.phone ?? '',
          email: user?.email ?? '',
          departmentId: String(staff.department_id),
          departmentName: department?.department_name ?? '',
        };
      })
      .filter(Boolean);
  }

  async getDoctors(query: Record<string, unknown> = {}) {
    const doctors = await this.doctorModel.find().sort({ doctor_code: 1 }).lean();
    const summaries = await this.buildDoctorSummaries(doctors);
    const departmentId = pickAlias<string>(query, ['departmentId', 'department_id']);
    const specialty = pickAlias<string>(query, ['specialty']);
    const keyword = String(pickAlias(query, ['keyword', 'q'], '') ?? '').trim().toLowerCase();

    return summaries.filter((item: any) => {
      if (departmentId && item.departmentId !== departmentId) return false;
      if (specialty && item.specialty !== specialty) return false;
      if (!keyword) return true;

      const haystack = [
        item.fullName,
        item.doctorCode,
        item.specialty,
        item.professionalRole,
        item.title,
        item.phone,
        item.email,
        item.departmentName,
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(keyword);
    });
  }

  async getDoctorDetail(id: string) {
    const doctor = await this.doctorModel.findById(requireObjectId(id, 'id')).lean();
    if (!doctor) throw new NotFoundException('Doctor not found');

    const staff = await this.staffModel.findById(doctor.staff_id).lean();
    if (!staff) throw new NotFoundException('Staff not found');

    const [user, profile, department] = await Promise.all([
      this.userModel.findById(staff.user_id).lean(),
      this.userProfileModel.findOne({ user_id: staff.user_id }).lean(),
      this.departmentModel.findById(staff.department_id).lean(),
    ]);

    return {
      doctorId: idText(doctor),
      staffId: idText(staff),
      userId: user ? idText(user) : null,
      fullName: profile?.full_name ?? '',
      avatar: profile?.image_url ?? null,
      specialty: doctor.specialty ?? '',
      code: doctor.doctor_code ?? '',
      socialInsurance: doctor.social_insurance ?? '',
      role: doctor.professional_role ?? '',
      title: doctor.title ?? staff.position ?? '',
      phone: profile?.phone ?? '',
      email: user?.email ?? '',
      cccd: profile?.cccd ?? '',
      dateOfBirth: profile?.date_of_birth ?? null,
      gender: profile?.gender ?? '',
      ethnicity: profile?.ethnicity ?? '',
      nationality: profile?.nationality ?? '',
      address: profile?.address ?? '',
      introduction: doctor.introduction ?? '',
      treatmentScope: doctor.treatment_scope ?? '',
      workHistory: doctor.work_history ?? '',
      achievements: doctor.achievements ?? '',
      departmentId: department ? idText(department) : null,
      departmentName: department?.department_name ?? '',
      attachments: (doctor.attachments ?? []).map((attachment: any) => ({
        name: attachment.name ?? '',
        url: attachment.url ?? '',
      })),
    };
  }

  async createDoctor(payload: Record<string, unknown>) {
    const username = pickAlias<string>(payload, ['username']);
    const email = pickAlias<string>(payload, ['email']);
    const fullName = pickAlias<string>(payload, ['fullName', 'full_name']);
    const departmentId = pickAlias<string>(payload, ['departmentId', 'department_id']);
    const doctorCode = pickAlias<string>(payload, ['doctorCode', 'doctor_code', 'code']);

    if (!username || !email || !fullName || !departmentId || !doctorCode) {
      throw new BadRequestException(
        'username, email, fullName, departmentId, doctorCode are required',
      );
    }

    const user = await this.userModel.create({
      username,
      email,
      password_hash: String(
        pickAlias(payload, ['password', 'passwordHash', 'password_hash']) ?? '123456',
      ),
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
        ? toIsoDate(
            pickAlias(payload, ['cccdExpiredDate', 'cccd_expired_date']),
            'cccdExpiredDate',
          )
        : undefined,
      ethnicity: pickAlias(payload, ['ethnicity']),
      nationality: pickAlias(payload, ['nationality']),
      image_url: pickAlias(payload, ['avatar', 'image', 'imageUrl', 'image_url']),
    });

    const staff = await this.staffModel.create({
      user_id: user._id,
      department_id: requireObjectId(departmentId, 'departmentId'),
      staff_code: pickAlias(payload, ['staffCode', 'staff_code']),
      position: pickAlias(payload, ['position', 'title']),
    });

    const doctor = await this.doctorModel.create({
      staff_id: staff._id,
      doctor_code: doctorCode,
      specialty: pickAlias(payload, ['specialty']),
      social_insurance: pickAlias(payload, ['socialInsurance', 'social_insurance']),
      professional_role: pickAlias(payload, ['role', 'professionalRole', 'professional_role']),
      title: pickAlias(payload, ['title']),
      introduction: pickAlias(payload, ['introduction']),
      treatment_scope: pickAlias(payload, ['treatmentScope', 'treatment_scope']),
      work_history: pickAlias(payload, ['workHistory', 'work_history']),
      achievements: pickAlias(payload, ['achievements']),
      attachments: this.normalizeAttachments(pickAlias(payload, ['attachments'], []), 'attachments'),
    });

    const doctorRole = await this.roleModel.findOneAndUpdate(
      { role_name: 'doctor' },
      { $setOnInsert: { role_name: 'doctor' } },
      { upsert: true, returnDocument: 'after' },
    );

    await this.userRoleModel.updateOne(
      { user_id: user._id, role_id: doctorRole._id },
      { $setOnInsert: { user_id: user._id, role_id: doctorRole._id } },
      { upsert: true },
    );

    return this.getDoctorDetail(idText(doctor));
  }

  async updateDoctor(doctorId: string, payload: Record<string, unknown>) {
    const doctor = await this.doctorModel.findById(requireObjectId(doctorId, 'doctorId')).lean();
    if (!doctor) throw new NotFoundException('Doctor not found');

    const staff = await this.staffModel.findById(doctor.staff_id).lean();
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
      [['avatar', 'image', 'imageUrl', 'image_url'], 'image_url'],
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
    if (expiredDate !== undefined) {
      profileSet.cccd_expired_date = toIsoDate(expiredDate, 'cccdExpiredDate');
    }
    if (Object.keys(profileSet).length) {
      await this.userProfileModel.updateOne({ user_id: staff.user_id }, { $set: profileSet });
    }

    const staffSet: Record<string, unknown> = {};
    const departmentId = pickAlias(payload, ['departmentId', 'department_id']);
    const staffCode = pickAlias(payload, ['staffCode', 'staff_code']);
    const position = pickAlias(payload, ['position', 'title']);
    if (departmentId) staffSet.department_id = requireObjectId(departmentId, 'departmentId');
    if (staffCode !== undefined) staffSet.staff_code = staffCode;
    if (position !== undefined) staffSet.position = position;
    if (Object.keys(staffSet).length) {
      await this.staffModel.updateOne({ _id: staff._id }, { $set: staffSet });
    }

    const doctorSet: Record<string, unknown> = {};
    const doctorMapping: Array<[string[], string]> = [
      [['doctorCode', 'doctor_code', 'code'], 'doctor_code'],
      [['specialty'], 'specialty'],
      [['socialInsurance', 'social_insurance'], 'social_insurance'],
      [['role', 'professionalRole', 'professional_role'], 'professional_role'],
      [['title'], 'title'],
      [['introduction'], 'introduction'],
      [['treatmentScope', 'treatment_scope'], 'treatment_scope'],
      [['workHistory', 'work_history'], 'work_history'],
      [['achievements'], 'achievements'],
    ];
    doctorMapping.forEach(([aliases, target]) => {
      const value = pickAlias(payload, aliases);
      if (value !== undefined) doctorSet[target] = value;
    });
    const attachments = pickAlias(payload, ['attachments']);
    if (attachments !== undefined) {
      doctorSet.attachments = this.normalizeAttachments(attachments, 'attachments');
    }
    if (Object.keys(doctorSet).length) {
      await this.doctorModel.updateOne({ _id: doctor._id }, { $set: doctorSet });
    }

    return this.getDoctorDetail(doctorId);
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
