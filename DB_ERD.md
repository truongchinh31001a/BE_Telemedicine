# Telemedicine DB ERD (MVP)

```mermaid
erDiagram
    USERS {
        int user_id PK
        string username UK
        string email UK
        string password_hash
        boolean is_active
        datetime created_at
        datetime updated_at
    }

    USER_PROFILES {
        int profile_id PK
        int user_id FK
        string full_name
        date date_of_birth
        string gender
        string phone
        string address
        string hometown
        string cccd UK
        date cccd_issue_date
        string cccd_issue_place
        date cccd_expired_date
        string ethnicity
        string nationality
        string image_url
        string cccd_front_url
        string cccd_back_url
    }

    ROLES {
        int role_id PK
        string role_name UK
    }

    USER_ROLES {
        int user_id FK
        int role_id FK
    }

    DEPARTMENTS {
        int department_id PK
        string department_name UK
    }

    STAFF {
        int staff_id PK
        int user_id FK
        int department_id FK
        string position
    }

    PATIENTS {
        int patient_id PK
        int user_id FK
        string patient_code UK
        string social_insurance_no
        string patient_job
        string membership_type
    }

    APPOINTMENTS {
        int appointment_id PK
        int staff_id FK
        int patient_id FK
        int record_id FK
        date work_date
        time start_time
        time end_time
        string type
        string room
        string status
        string note
        datetime created_at
    }

    APPOINTMENT_MEMBERS {
        int appointment_id FK
        int staff_id FK
        string member_role
    }

    SCHEDULES {
        int schedule_id PK
        int department_id FK
        string event_name
        string event_type
        date work_date
        time start_time
        time end_time
        string room
        string note
    }

    SCHEDULE_MEMBERS {
        int schedule_id FK
        int staff_id FK
    }

    MEDICAL_RECORDS {
        int record_id PK
        int patient_id FK
        int staff_id FK
        int appointment_id FK
        string diagnosis
        string conclusion
        datetime created_at
        datetime updated_at
    }

    MEDICAL_HISTORIES {
        int history_id PK
        int record_id FK
        string type
        string title
        string note
        date history_date
    }

    VITALS {
        int vitals_id PK
        int record_id FK
        decimal height_cm
        decimal weight_kg
        decimal temperature_c
        int heart_rate
        string blood_pressure
        int respiratory_rate
        int oxygen_saturation
        string note
        datetime measured_at
    }

    LAB_TESTS {
        int lab_test_id PK
        int record_id FK
        string name
        string result
        string unit
        string reference_range
        datetime tested_at
    }

    IMAGING_TESTS {
        int imaging_test_id PK
        int record_id FK
        string name
        string result
        string note
        datetime tested_at
    }

    DRUGS {
        int drug_id PK
        string drug_name
        string unit
        int stock
    }

    PRESCRIPTIONS {
        int prescription_id PK
        int record_id FK
        datetime start_date
        int days
        datetime created_at
    }

    PRESCRIPTION_DETAILS {
        int detail_id PK
        int prescription_id FK
        int drug_id FK
        string unit
        decimal quantity
        string time_of_day
        string meal_timing
        string note
    }

    USERS ||--|| USER_PROFILES : has
    USERS ||--o{ USER_ROLES : assigned
    ROLES ||--o{ USER_ROLES : contains

    USERS ||--o| STAFF : maps
    USERS ||--o| PATIENTS : maps
    DEPARTMENTS ||--o{ STAFF : manages

    STAFF ||--o{ APPOINTMENTS : attends
    PATIENTS ||--o{ APPOINTMENTS : books
    APPOINTMENTS ||--o{ APPOINTMENT_MEMBERS : has
    STAFF ||--o{ APPOINTMENT_MEMBERS : joins

    DEPARTMENTS ||--o{ SCHEDULES : owns
    SCHEDULES ||--o{ SCHEDULE_MEMBERS : has
    STAFF ||--o{ SCHEDULE_MEMBERS : joins

    PATIENTS ||--o{ MEDICAL_RECORDS : has
    STAFF ||--o{ MEDICAL_RECORDS : creates
    APPOINTMENTS ||--o| MEDICAL_RECORDS : generates

    MEDICAL_RECORDS ||--o{ MEDICAL_HISTORIES : includes
    MEDICAL_RECORDS ||--o{ VITALS : includes
    MEDICAL_RECORDS ||--o{ LAB_TESTS : includes
    MEDICAL_RECORDS ||--o{ IMAGING_TESTS : includes
    MEDICAL_RECORDS ||--o{ PRESCRIPTIONS : includes

    PRESCRIPTIONS ||--o{ PRESCRIPTION_DETAILS : has
    DRUGS ||--o{ PRESCRIPTION_DETAILS : used_in
```

## Notes
- `status` in `APPOINTMENTS`: `pending | confirmed | canceled`.
- Add unique indexes for `username`, `email`, `cccd`, and `patient_code`.
- `MEDICAL_RECORDS` is root clinical entity; all clinical details hang off `record_id`.
