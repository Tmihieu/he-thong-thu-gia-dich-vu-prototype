package vn.dongthanh.vsmt.platform.common;

import lombok.Getter;

/** Vượt hạn mức thao tác, trả 429 kèm Retry-After (giây). */
@Getter
public class RateLimitException extends RuntimeException {

    private final String code;
    private final long retryAfterSeconds;

    public RateLimitException(String code, String message, long retryAfterSeconds) {
        super(message);
        this.code = code;
        this.retryAfterSeconds = Math.max(1, retryAfterSeconds);
    }
}
