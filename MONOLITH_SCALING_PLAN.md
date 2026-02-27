# Monolith Scaling Plan

## 1) Current Architecture

Project đang theo mô hình **modular monolith** với NestJS:

1. `AppModule` làm root module.
2. Module chức năng tách theo domain:
   - `AuthModule`
   - `ApiModule`
   - `DatabaseModule`
3. Một process HTTP duy nhất chạy từ `src/main.ts`.

## 2) Module Boundaries (Keep and Enforce)

1. `auth/*`: xác thực, phân quyền, JWT strategy/guard.
2. `api/*`: nghiệp vụ chính (appointment, master-data, medical-records, prescriptions).
3. `database/*`: kết nối DB + schema + seed.

Quy tắc:

1. Không import chéo tùy tiện giữa feature; chỉ export thứ cần thiết qua module.
2. Mỗi controller chỉ gọi service cùng feature hoặc qua service facade rõ ràng.
3. DTO/validation đặt theo từng feature để tránh coupling.

## 3) Performance and Reliability in Monolith

1. Bật cache cho API đọc nhiều (departments, drugs, staff list).
2. Dùng pagination mặc định cho list endpoints.
3. Index MongoDB cho các field query thường dùng (`patientId`, `recordId`, `appointmentId`, `createdAt`).
4. Dùng queue nền (BullMQ/RabbitMQ) cho tác vụ nặng không cần response ngay:
   - gửi notification
   - xử lý batch
   - đồng bộ báo cáo
5. Timeout + retry có giới hạn khi gọi external service.

## 4) Security Baseline

1. Giữ global guards hiện có (`JwtAuthGuard`, `RolesGuard`).
2. Chuẩn hóa policy role theo endpoint.
3. Dùng env secret cho JWT và DB URI (không hardcode cho production).
4. Bật request-id/correlation-id để trace request xuyên suốt.

## 5) Observability

1. Structured logging (JSON).
2. Metrics cơ bản: request count, latency, error rate.
3. Health endpoints:
   - liveness
   - readiness (DB check)
4. Alert theo ngưỡng lỗi và p95 latency.

## 6) Testing Strategy

1. Unit test cho service nghiệp vụ chính.
2. E2E test cho flow quan trọng:
   - login
   - schedule appointment
   - create/update medical record
   - create/update prescription
3. Smoke test sau deploy.

## 7) Deployment Strategy (Monolith)

1. Build artifact duy nhất (`dist/main.js`).
2. Docker image duy nhất cho backend.
3. Horizontal scale bằng nhiều replica cùng app.
4. Zero-downtime deploy (rolling update).

## 8) Priority Backlog

1. Chuẩn hóa DTO + validation cho toàn bộ controller.
2. Thêm pagination/filter/sort thống nhất.
3. Thêm index MongoDB cho collection nóng.
4. Thêm cache layer cho master data.
5. Bổ sung logging + metrics + healthcheck hoàn chỉnh.
6. Tăng coverage test cho các endpoint quan trọng.

