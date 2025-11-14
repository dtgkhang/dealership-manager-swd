import React from "react";
import { Card } from "../components/ui";

export default function Guide() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Hướng dẫn quy trình</h2>

      <Card title="Quy trình cho Quản lý (Manager)">
        <ol className="list-decimal pl-5 space-y-1 text-sm text-gray-800">
          <li>Tạo PO (Đặt từ hãng) với model, số lượng, ETA.</li>
          <li>Xác nhận PO (CONFIRMED) để sinh xe trong kho (ON_ORDER).</li>
          <li>Khi xe về, <span className="font-medium">Đánh dấu về đại lý</span> (AT_DEALER) và gán VIN nếu có.</li>
          <li>Quản lý Voucher: tạo/hủy/khôi phục, xem thời gian hiệu lực và điều kiện áp dụng.</li>
          <li>Quản lý Tài khoản: tạo người dùng, gán/chuyển role, đặt lại mật khẩu.</li>
          <li>Theo dõi Dashboard: xe tại đại lý, PO theo trạng thái, doanh thu, biểu đồ 7 ngày.</li>
        </ol>
      </Card>

      <Card title="Quy trình cho Nhân viên (Staff)">
        <ol className="list-decimal pl-5 space-y-1 text-sm text-gray-800">
          <li>Tạo Đơn khách: chọn mẫu xe, nhập thông tin khách, giá, (tuỳ chọn) chọn voucher để chốt giá.</li>
          <li>Lập Phiếu giao: chọn Đơn khách (chưa hoàn tất) và VIN phù hợp model, kiểm tra giá sau khuyến mãi (được chốt từ đơn).</li>
          <li>Hoàn tất Phiếu giao: xe chuyển DELIVERED, Đơn khách chuyển COMPLETED.</li>
          <li>Xem doanh thu trong Phiếu giao/Đơn khách (chỉ của cá nhân).</li>
        </ol>
      </Card>

      <Card title="Nguyên tắc nghiệp vụ">
        <ul className="list-disc pl-5 space-y-1 text-sm text-gray-800">
          <li>Mỗi Đơn khách chỉ có tối đa 1 Phiếu giao.</li>
          <li>Voucher áp dụng tại bước Đơn khách (khóa giá). Phiếu giao chỉ đọc lại giá.</li>
          <li>Chỉ lập Phiếu giao khi xe ở trạng thái AT_DEALER.</li>
          <li>Staff chỉ thấy và thao tác trên dữ liệu của chính mình; Manager xem toàn bộ.</li>
          <li>Xe đã DELIVERED hoặc đã AT_DEALER không thể đánh dấu “về đại lý” lại.</li>
        </ul>
      </Card>

      <Card title="Mẹo nhanh">
        <ul className="list-disc pl-5 space-y-1 text-sm text-gray-800">
          <li>Sử dụng tìm kiếm/lọc ở mỗi bảng để tra cứu nhanh.</li>
          <li>Ở Phiếu giao, chỉ hiện VIN đúng model của Đơn khách đã chọn.</li>
          <li>Ở Đơn khách, xem trước giảm giá ngay khi chọn voucher.</li>
        </ul>
      </Card>
    </div>
  );
}

