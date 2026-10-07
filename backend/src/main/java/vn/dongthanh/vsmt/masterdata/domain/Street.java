package vn.dongthanh.vsmt.masterdata.domain;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import jakarta.persistence.CascadeType;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import vn.dongthanh.vsmt.platform.common.BaseEntity;

/**
 * Đường hoặc hẻm trong danh mục chuẩn của xã. Hồ sơ hộ liên kết bằng {@code id}, không bằng tên.
 * Đường gắn với các ấp nó đi qua; hẻm là con của một đường, tên ngắn ("Hẻm 19"), hiển thị kèm tên đường.
 */
@Getter
@Entity
@Table(name = "streets")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Street extends BaseEntity {

    public enum Kind {
        STREET, ALLEY
    }

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10, updatable = false)
    private Kind kind;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id", updatable = false)
    private Street parent;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(nullable = false, length = 200)
    private String nameKey;

    @Setter
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ActiveStatus status;

    /** Id các ấp đường đi qua (hẻm thường để trống, lọc theo đường cha). */
    @ElementCollection
    @CollectionTable(name = "street_areas", joinColumns = @JoinColumn(name = "street_id"))
    @Column(name = "area_id")
    private Set<Long> areaIds = new HashSet<>();

    @OneToMany(mappedBy = "street", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id")
    private List<StreetOldName> oldNames = new ArrayList<>();

    public static Street street(String name) {
        return create(Kind.STREET, null, name);
    }

    public static Street alley(Street parent, String name) {
        if (parent.kind != Kind.STREET) {
            throw new IllegalArgumentException("Hẻm phải thuộc một đường");
        }
        return create(Kind.ALLEY, parent, name);
    }

    private static Street create(Kind kind, Street parent, String name) {
        Street s = new Street();
        s.kind = kind;
        s.parent = parent;
        s.setNameText(name);
        s.status = ActiveStatus.ACTIVE;
        return s;
    }

    /** Tên hiển thị: hẻm ghép tên đường cha ("Hẻm 19 Tô Ký"). */
    public String getDisplayName() {
        return parent == null ? name : name + " " + parent.getDisplayName();
    }

    public void setAreaIds(Set<Long> ids) {
        areaIds.clear();
        areaIds.addAll(ids);
    }

    /** Đổi tên: giữ tên cũ (kèm văn bản) để vẫn tìm được và không đổi nghĩa địa chỉ cũ. */
    public void rename(String newName, String note) {
        String oldName = name;
        setNameText(newName);
        // Đổi lại về một tên cũ thì tên đó thôi là tên cũ.
        oldNames.removeIf(o -> o.getNameKey().equals(nameKey));
        addOldName(oldName, note);
    }

    /** Thêm tên cũ (không trùng tên hiện tại hay tên cũ đã có). */
    public void addOldName(String oldName, String note) {
        String key = AddressText.streetKey(oldName);
        if (key.isEmpty() || key.equals(nameKey) || oldNames.stream().anyMatch(o -> o.getNameKey().equals(key))) {
            return;
        }
        oldNames.add(StreetOldName.of(this, oldName, note));
    }

    private void setNameText(String text) {
        this.name = text.trim().replaceAll("\\s+", " ");
        this.nameKey = AddressText.streetKey(this.name);
    }
}
