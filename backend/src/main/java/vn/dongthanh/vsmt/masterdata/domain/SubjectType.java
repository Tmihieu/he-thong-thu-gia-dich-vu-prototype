package vn.dongthanh.vsmt.masterdata.domain;

public enum SubjectType {
    HOUSEHOLD,
    BUSINESS_HOUSEHOLD,
    ENTERPRISE;

    /** Tiền tố mã đối tượng và số chữ số theo sau (tổng 7 ký tự sau dấu gạch). */
    public String codePrefix() {
        return switch (this) {
            case HOUSEHOLD -> "H";
            case BUSINESS_HOUSEHOLD -> "KD";
            case ENTERPRISE -> "DN";
        };
    }
}
