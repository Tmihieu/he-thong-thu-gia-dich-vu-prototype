package vn.dongthanh.vsmt.masterdata.domain;

import java.time.OffsetDateTime;

import org.hibernate.annotations.CreationTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Tên cũ của một đường/hẻm (đổi tên theo văn bản); gõ tên cũ vẫn tìm ra đường. */
@Getter
@Entity
@Table(name = "street_old_names")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class StreetOldName {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "street_id", nullable = false, updatable = false)
    private Street street;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(nullable = false, length = 200)
    private String nameKey;

    @Column(length = 255)
    private String note;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    static StreetOldName of(Street street, String name, String note) {
        StreetOldName o = new StreetOldName();
        o.street = street;
        o.name = name.trim().replaceAll("\\s+", " ");
        o.nameKey = AddressText.streetKey(o.name);
        o.note = note == null || note.isBlank() ? null : note.trim();
        return o;
    }
}
