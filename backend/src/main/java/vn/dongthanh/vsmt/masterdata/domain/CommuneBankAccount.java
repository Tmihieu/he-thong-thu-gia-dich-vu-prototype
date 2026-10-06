package vn.dongthanh.vsmt.masterdata.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import vn.dongthanh.vsmt.platform.common.BaseEntity;

/** Tài khoản nhận chuyển khoản chung của xã (UC-54); bảng chỉ có một dòng (cột {@code singleton} ở DB). */
@Getter
@Setter
@Entity
@Table(name = "commune_bank_account")
@NoArgsConstructor
public class CommuneBankAccount extends BaseEntity {

    @Column(nullable = false, length = 100)
    private String bankName;

    @Column(nullable = false, length = 50)
    private String accountNumber;

    @Column(nullable = false, length = 150)
    private String accountHolder;
}
