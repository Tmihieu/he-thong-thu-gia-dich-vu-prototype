"""Sinh các entity Jmix ánh xạ vào bảng có sẵn của backend (Flyway quản schema, Jmix chỉ đọc/ghi dữ liệu).

Chạy từ thư mục jmix-admin: python tools/gen_entities.py
"""
B = 'src/main/java/vn/dongthanh/vsmt/jmixadmin/entity/'
HDR = '''package vn.dongthanh.vsmt.jmixadmin.entity;

import io.jmix.core.metamodel.annotation.InstanceName;
import io.jmix.core.metamodel.annotation.JmixEntity;
import jakarta.persistence.*;

import java.time.LocalDate;
import java.time.OffsetDateTime;

/** %s */
@JmixEntity
@Table(name = "%s")
@Entity(name = "vsmt_%s")
public class %s {

    @Id
    @Column(name = "id", nullable = false)
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
'''
AUDIT = '''
    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @Version
    @Column(name = "version", nullable = false)
    private Integer version;
'''
TAIL = '''
    @PrePersist
    void onCreate() {
        OffsetDateTime now = OffsetDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
    public Integer getVersion() { return version; }
    public void setVersion(Integer version) { this.version = version; }
}
'''
I = '@InstanceName'
LOB = '@Lob'


def gen(cls, table, doc, fields):
    s = HDR % (doc, table, cls, cls)
    for (n, t, col, ln, nullable, annos) in fields:
        s += '\n'
        for a in annos:
            s += '    ' + a + '\n'
        if t == 'REL':
            s += '    @ManyToOne(fetch = FetchType.LAZY, optional = false)\n'
            s += '    @JoinColumn(name = "%s", nullable = false)\n' % col
            t = ln
        else:
            col_anno = '@Column(name = "%s"%s%s)' % (
                col, '' if nullable else ', nullable = false', (', length = %d' % ln) if ln else '')
            s += '    ' + col_anno + '\n'
        s += '    private %s %s;\n' % (t, n)
    s += AUDIT
    s += '\n    public Long getId() { return id; }\n    public void setId(Long id) { this.id = id; }\n'
    for (n, t, col, ln, nullable, annos) in fields:
        jt = ln if t == 'REL' else t
        N = n[0].upper() + n[1:]
        s += '    public %s get%s() { return %s; }\n' % (jt, N, n)
        s += '    public void set%s(%s %s) { this.%s = %s; }\n' % (N, jt, n, n, n)
    s += TAIL
    open(B + cls + '.java', 'w', encoding='utf-8').write(s)


gen('District', 'districts', 'Bảng districts (V3): địa bàn sau sáp nhập.', [
    ('code', 'String', 'code', 10, False, []),
    ('name', 'String', 'name', 100, False, [I]),
    ('note', 'String', 'note', 0, True, [LOB]),
    ('sortOrder', 'Integer', 'sort_order', 0, True, []),
])
gen('Area', 'areas', 'Bảng areas (V3): khu vực / tổ dân phố.', [
    ('code', 'String', 'code', 10, False, []),
    ('name', 'String', 'name', 100, False, [I]),
    ('district', 'REL', 'district_id', 'District', False, []),
    ('status', 'String', 'status', 30, False, []),
    ('note', 'String', 'note', 0, True, [LOB]),
])
gen('Company', 'companies', 'Bảng companies (V3): công ty / đơn vị thu gom.', [
    ('code', 'String', 'code', 10, False, []),
    ('name', 'String', 'name', 200, False, [I]),
    ('contactName', 'String', 'contact_name', 100, False, []),
    ('contactPhone', 'String', 'contact_phone', 15, False, []),
    ('status', 'String', 'status', 30, False, []),
    ('validFrom', 'LocalDate', 'valid_from', 0, False, []),
    ('validTo', 'LocalDate', 'valid_to', 0, True, []),
    ('orgType', 'String', 'org_type', 30, True, []),
    ('taxCode', 'String', 'tax_code', 14, True, []),
    ('address', 'String', 'address', 255, True, []),
    ('email', 'String', 'email', 100, True, []),
    ('communeContractNo', 'String', 'commune_contract_no', 50, True, []),
    ('bankAccount', 'String', 'bank_account', 50, True, []),
    ('bankName', 'String', 'bank_name', 100, True, []),
])
gen('FeeType', 'fee_types', 'Bảng fee_types (V4): loại phí.', [
    ('code', 'String', 'code', 20, False, []),
    ('name', 'String', 'name', 100, False, [I]),
    ('pricingMode', 'String', 'pricing_mode', 30, False, []),
    ('defaultPrice', 'Long', 'default_price', 0, True, []),
    ('active', 'Boolean', 'active', 0, False, []),
])
