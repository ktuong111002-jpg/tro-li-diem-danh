// --- THẦY DÁN URL APPS SCRIPT CỦA MÌNH VÀO ĐÂY ---
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbybqoOIF8nKeNZtuGMPlilUAGII29_IPrKu22GXDtMVDJFqUCQCnY9YEGJlHLmlrxF9/exec"; 

// Biến kiểm soát tránh quét liên tục cùng một mã trong tích tắc
let lastScannedCode = "";
let isProcessing = false;

// Hàm gửi dữ liệu điểm danh lên Google Sheets
async function sendAttendanceData(qrCodeText) {
    if (isProcessing) return;
    isProcessing = true;

    // Chuẩn bị dữ liệu gửi đi (giả sử mã QR chứa trực tiếp mã học sinh, hoặc định dạng JSON)
    let payload = {};
    try {
        payload = JSON.parse(qrCodeText);
    } catch (e) {
        // Nếu QR chỉ là chuỗi mã học sinh đơn thuần (VD: HS12001)
        payload = { 
            maHS: qrCodeText.trim(),
            hoTen: "Học sinh quét QR", 
            lop: "11/12",
            ghiChu: "Quét tự động qua Web"
        };
    }

    showNotification("Đang xử lý điểm danh...", "bg-amber-500");

    try {
        const response = await fetch(WEB_APP_URL, {
            method: "POST",
            headers: {
                "Content-Type": "text/plain;charset=utf-8", // Tránh lỗi CORS preflight với Google Apps Script
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.status === "success") {
            showNotification(`✅ THÀNH CÔNG: ${result.message}`, "bg-emerald-600");
        } else {
            showNotification(`❌ LỖI: ${result.message}`, "bg-rose-600");
        }
    } catch (err) {
        console.error(err);
        showNotification("❌ Không thể kết nối tới máy chủ Google Sheets!", "bg-rose-600");
    } finally {
        // Sau 3 giây cho phép quét tiếp mã mới
        setTimeout(() => {
            isProcessing = false;
            lastScannedCode = "";
        }, 3000);
    }
}

// Hàm hiển thị hộp thông báo trên giao diện
function showNotification(message, bgClass) {
    const box = document.getElementById("result-box");
    box.className = `p-4 rounded-xl text-white font-medium transition-all ${bgClass}`;
    box.innerText = message;
    box.classList.remove("hidden");
}

// Khởi chạy camera quét QR khi trang web vừa tải xong
function onScanSuccess(decodedText, decodedResult) {
    if (decodedText !== lastScannedCode) {
        lastScannedCode = decodedText;
        console.log(`Đã quét được mã: ${decodedText}`);
        sendAttendanceData(decodedText);
    }
}

function onScanFailure(error) {
    // Bỏ qua lỗi khung hình liên tục khi chưa bắt được mã QR để tránh rối console
}

// Kích hoạt html5-qrcode camera
document.addEventListener("DOMContentLoaded", () => {
    const html5QrCode = new Html5Qrcode("reader");
    
    html5QrCode.start(
        { facingMode: "environment" }, // Ưu tiên dùng camera sau trên điện thoại
        {
            fps: 10,    // Số khung hình quét mỗi giây
            qrbox: { width: 250, height: 250 } // Kích thước khung ngắm quét QR
        },
        onScanSuccess,
        onScanFailure
    ).catch(err => {
        console.error("Không thể mở camera:", err);
        showNotification("⚠️ Không thể mở camera. Vui lòng cấp quyền truy cập camera trên trình duyệt!", "bg-amber-600");
    });
});