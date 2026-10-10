package vn.dongthanh.vsmt.remittance.domain;

/** Sai số tiền / Sai kỳ thu / Sai chứng từ / Không phải khoản nộp của công ty. */
public enum ReceiptIssueType {
    WRONG_AMOUNT,
    WRONG_PERIOD,
    WRONG_DOCUMENT,
    NOT_OURS
}
