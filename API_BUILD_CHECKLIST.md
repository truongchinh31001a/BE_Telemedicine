# API Build Checklist (Current Backend Contract)

Last updated: 2026-02-26

## Global Rules

- Base URL default: `http://localhost:8000`
- Swagger UI: `/api-docs`
- OpenAPI JSON: `/api-docs-json`
- Response format standard: `camelCase`
- Input alias accepted during migration: `camelCase`, `snake_case`, and some legacy keys
- ID type: `string` (Mongo ObjectId), not integer
- Auth required for almost all business endpoints:
  - Header: `Authorization: Bearer <accessToken>`
  - Public endpoints: `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /`, `GET /api-docs`, `GET /api-docs-json`

## Auth

- [x] `POST /auth/login` (public)
- [x] `POST /auth/refresh` (public)
- [x] `POST /auth/logout` (public)
- [x] `GET /auth/me`

### Auth Token Contract (Production-style)

- Login response trả về:
  - `accessToken`
  - `refreshToken`
  - `tokenType` = `Bearer`
  - `expiresIn` (access token TTL)
  - `accessTokenExpiresIn`
  - `refreshTokenExpiresIn`
  - `user`
- Refresh flow:
  - Gọi `POST /auth/refresh` với `refreshToken`
  - Backend rotate refresh token (token cũ bị revoke)
  - Trả về cặp token mới (`accessToken`, `refreshToken`)
- Logout flow:
  - Gọi `POST /auth/logout` với `refreshToken`
  - Backend revoke refresh session tương ứng

## 1) Master Data

### Departments
- [x] `GET /departments`

### Staff
- [x] `GET /staff`
- [x] `GET /staff/:id`
- [x] `POST /staff`
- [x] `PUT /staff/:id`

### Patients
- [x] `GET /patients`
- [x] `GET /patients/:id`
- [x] `POST /patients`
- [x] `PUT /patients/:id`

### Drug
- [x] `GET /drug`
- [x] `POST /drug`

---

## 2) Appointment + Schedule

### Appointment
- [x] `GET /appointment/me`
- [x] `PATCH /appointment/:appointmentId/cancel`

### Schedule
- [x] `POST /appointment/schedule`
- [x] `GET /appointment/available-slots`

---

## 3) Medical Records

- [x] `POST /medical-records`
- [x] `PUT /medical-records/:id`
- [x] `GET /medical-records/records/:id`
- [x] `GET /medical-records/patient/:id`
- [x] `GET /medical-records/patient/history/:id`
- [x] `PUT /medical-records/history/:type/:id`
- [x] `POST /medical-records/vitals`
- [x] `GET /medical-records/patient/vitals/:id`
- [x] `PUT /medical-records/vitals/edit/:id`
- [x] `GET /lab-tests/:id`
- [x] `GET /imaging-tests/:id`

---

## 4) Prescriptions

- [x] `GET /prescriptions/:id` (id = `recordId`)
- [x] `POST /prescriptions/:recordId`
- [x] `PUT /prescriptions/:recordId`
- [x] `PUT /prescriptions/:type/:id` (legacy path)
- [x] `POST /prescriptions/create-treatment/:appointmentId`
- [x] `PUT /prescriptions/detail`
- [x] `DELETE /prescriptions/detail/:detailId`
- [x] `GET /prescriptions/patient/:patientId`
- [x] `GET /medical-records/patient/prescriptions`

---

## 5) Role Access (Current)

- `admin`: full access
- `doctor`: clinical + schedule + drug write
- `nurse`: clinical + schedule
- `patient`: read-focused endpoints, own-use scenarios via FE

Note: Backend currently enforces role-level access. Fine-grained owner checks (e.g. patient can only read own record) are not fully enforced yet.

---

## 6) FE Integration Notes

- Please treat all IDs as string.
- Keep sending alias keys during migration if needed, backend still accepts them.
- Prefer using canonical keys in new FE code:
  - `patientId`, `staffId`, `recordId`, `appointmentId`, `startDate`, etc.

---

## 7) Verification Status

- [x] `npm run build`
- [x] unit test pass
- [x] e2e checklist flow pass (with auth)
- [x] e2e `Auth refresh + logout flow` pass
