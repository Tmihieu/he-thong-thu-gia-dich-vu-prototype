package vn.dongthanh.vsmt.masterdata.domain;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import vn.dongthanh.vsmt.platform.common.BaseEntity;

/** Phiên bản biểu giá theo căn cứ pháp lý và hiệu lực (data dictionary §2.2 TariffVersion). */
@Getter
@Setter
@Entity
@Table(name = "tariff_versions")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TariffVersion extends BaseEntity {

    @Setter(AccessLevel.NONE)
    @Column(nullable = false, updatable = false, length = 20)
    private String code;

    @Column(nullable = false, length = 100)
    private String legalBasis;

    private LocalDate issuedDate;

    @Column(nullable = false)
    private LocalDate validFrom;

    private LocalDate validTo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private TariffStatus status;

    @Column(length = 255)
    private String scopeNote;

    private String note;

    /** Thu theo nhân khẩu cho mọi hộ gia đình toàn xã (áp từ kỳ dùng biểu giá này). */
    @Column(nullable = false)
    private boolean perCapitaAll;

    /** Thu theo nhân khẩu cho mọi hộ gia đình trong các địa bàn này (khi không bật toàn xã). */
    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(name = "tariff_version_per_capita_districts", joinColumns = @JoinColumn(name = "tariff_version_id"),
            inverseJoinColumns = @JoinColumn(name = "district_id"))
    private Set<District> perCapitaDistricts = new HashSet<>();

    @Setter(AccessLevel.NONE)
    @OrderBy("monthlyTotal")
    @OneToMany(mappedBy = "tariffVersion", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<TariffRate> rates = new ArrayList<>();

    public static TariffVersion create(String code, String legalBasis, LocalDate validFrom, LocalDate validTo,
            TariffStatus status) {
        TariffVersion v = new TariffVersion();
        v.code = code;
        v.legalBasis = legalBasis;
        v.validFrom = validFrom;
        v.validTo = validTo;
        v.status = status;
        return v;
    }

    public TariffRate addRate(TariffGroup group, long collectionFee, long transportFee, String unitLabel) {
        return addRate(group, collectionFee, transportFee, 0, unitLabel);
    }

    public TariffRate addRate(TariffGroup group, long collectionFee, long transportFee, long processingFee,
            String unitLabel) {
        TariffRate rate = TariffRate.create(this, group, collectionFee, transportFee, processingFee, unitLabel);
        rates.add(rate);
        return rate;
    }

    /** Đặt đơn giá một nhóm (dự thảo): có rồi thì sửa tại chỗ, chưa có thì thêm. */
    public void putRate(TariffGroup group, long collectionFee, long transportFee, long processingFee, String unitLabel) {
        rateFor(group).ifPresentOrElse(r -> r.update(collectionFee, transportFee, processingFee, unitLabel),
                () -> addRate(group, collectionFee, transportFee, processingFee, unitLabel));
    }

    /** Bỏ đơn giá một nhóm (dự thảo), dùng cho nhóm không bắt buộc. */
    public void removeRate(TariffGroup group) {
        rates.removeIf(r -> r.getTariffGroup() == group);
    }

    /** Hộ gia đình ở địa bàn {@code district} tính theo nhân khẩu theo biểu giá này. */
    public boolean perCapitaIn(District district) {
        return perCapitaAll || (district != null && perCapitaDistricts.stream().anyMatch(d -> d.getId() != null
                ? d.getId().equals(district.getId()) : d == district));
    }

    public boolean hasPerCapita() {
        return perCapitaAll || !perCapitaDistricts.isEmpty();
    }

    /** Ban hành dự thảo: chuyển sang Đang áp dụng, ghi ngày ban hành. */
    public void issue(LocalDate today) {
        status = TariffStatus.ACTIVE;
        issuedDate = today;
    }

    /** Kết thúc hiệu lực ngay trước {@code nextFrom} (bị bản mới thay); hết hạn trước hôm nay thì chuyển Hết hiệu lực. */
    public void endBefore(LocalDate nextFrom, LocalDate today) {
        validTo = nextFrom.minusDays(1);
        if (validTo.isBefore(today)) {
            status = TariffStatus.EXPIRED;
        }
    }

    /** Ngày {@code date} nằm trong hiệu lực (hai đầu tính cả; không có ngày hết hạn = vô thời hạn). */
    public boolean covers(LocalDate date) {
        return !date.isBefore(validFrom) && (validTo == null || !date.isAfter(validTo));
    }

    public Optional<TariffRate> rateFor(TariffGroup group) {
        return rates.stream().filter(r -> r.getTariffGroup() == group).findFirst();
    }
}
