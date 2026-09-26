package vn.dongthanh.vsmt.support;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;

/** Đồng hồ cho IT: mặc định {@link FixedClockConfig#NOW}; test dời ngày bằng {@link #set} và gọi {@link #reset}. */
public class MutableClock extends Clock {

    private final ZoneId zone;
    private volatile Instant now;

    public MutableClock(Instant now, ZoneId zone) {
        this.now = now;
        this.zone = zone;
    }

    public void set(Instant instant) {
        this.now = instant;
    }

    public void reset() {
        this.now = FixedClockConfig.NOW;
    }

    @Override
    public ZoneId getZone() {
        return zone;
    }

    @Override
    public Clock withZone(ZoneId zone) {
        return new MutableClock(now, zone);
    }

    @Override
    public Instant instant() {
        return now;
    }
}
