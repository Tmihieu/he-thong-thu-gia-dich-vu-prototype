package vn.dongthanh.vsmt.citizen.domain;

import java.time.OffsetDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import vn.dongthanh.vsmt.masterdata.domain.ServiceSubject;
import vn.dongthanh.vsmt.platform.common.BaseEntity;
import vn.dongthanh.vsmt.platform.domain.UserStatus;

/** Tài khoản app người dân: một SĐT gắn với một hộ; một hộ có thể có nhiều tài khoản (D11). */
@Getter
@Entity
@Table(name = "citizen_accounts")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CitizenAccount extends BaseEntity {

    @Column(nullable = false, updatable = false, length = 15)
    private String phone;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "subject_id", nullable = false)
    private ServiceSubject subject;

    @Column(nullable = false, length = 100)
    private String displayName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private UserStatus status;

    private OffsetDateTime lastLoginAt;

    public static CitizenAccount create(String phone, ServiceSubject subject, String displayName) {
        CitizenAccount a = new CitizenAccount();
        a.phone = phone;
        a.subject = subject;
        a.displayName = displayName;
        a.status = UserStatus.ACTIVE;
        return a;
    }

    public boolean isActive() {
        return status == UserStatus.ACTIVE;
    }

    public void lock() {
        status = UserStatus.LOCKED;
    }

    public void recordLogin(OffsetDateTime at) {
        lastLoginAt = at;
    }
}
