package vn.dongthanh.vsmt.masterdata.service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.masterdata.domain.FeeType;
import vn.dongthanh.vsmt.masterdata.domain.FeeTypeRepository;
import vn.dongthanh.vsmt.masterdata.domain.TariffGroup;
import vn.dongthanh.vsmt.masterdata.domain.TariffRate;
import vn.dongthanh.vsmt.masterdata.domain.TariffStatus;
import vn.dongthanh.vsmt.masterdata.domain.TariffVersion;
import vn.dongthanh.vsmt.masterdata.domain.TariffVersionRepository;
import vn.dongthanh.vsmt.platform.common.BusinessRuleException;

/**
 * Tra biểu giá theo ngày. Phiên bản áp dụng cho một ngày là phiên bản đã ban hành (không phải dự thảo)
 * có hiệu lực bao trùm ngày đó; phiên bản đã hết hiệu lực vẫn dùng được cho ngày trong quá khứ (kỳ 08/2026).
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TariffService {

    static final DateTimeFormatter VN_DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final TariffVersionRepository versions;
    private final FeeTypeRepository feeTypes;

    public TariffVersion activeVersionOn(LocalDate date) {
        List<TariffVersion> covering = versions.findAllWithRatesByStatusNot(TariffStatus.DRAFT).stream()
                .filter(v -> v.covers(date))
                .toList();
        if (covering.isEmpty()) {
            throw new BusinessRuleException("TARIFF_NOT_FOUND",
                    "Không có biểu giá có hiệu lực vào ngày " + VN_DATE.format(date) + ".");
        }
        if (covering.size() == 1) {
            return covering.get(0);
        }
        // Chồng lấn chỉ có thể giữa một bản ACTIVE và bản đã hết hiệu lực: ưu tiên bản đang áp dụng.
        List<TariffVersion> active = covering.stream().filter(v -> v.getStatus() == TariffStatus.ACTIVE).toList();
        if (active.size() == 1) {
            return active.get(0);
        }
        throw new BusinessRuleException("TARIFF_AMBIGUOUS", "Có nhiều biểu giá cùng hiệu lực vào ngày "
                + VN_DATE.format(date) + ": " + covering.stream().map(TariffVersion::getCode).toList()
                + ". Vui lòng điều chỉnh hiệu lực biểu giá.");
    }

    public TariffRate rateOn(LocalDate date, TariffGroup group) {
        TariffVersion version = activeVersionOn(date);
        return version.rateFor(group).orElseThrow(() -> new BusinessRuleException("TARIFF_RATE_NOT_FOUND",
                "Biểu giá " + version.getCode() + " chưa có đơn giá cho nhóm " + group + "."));
    }

    public List<TariffVersion> versions() {
        return versions.findAllWithRates();
    }

    public List<FeeType> feeTypes() {
        return feeTypes.findAllByOrderByCodeAsc();
    }
}
