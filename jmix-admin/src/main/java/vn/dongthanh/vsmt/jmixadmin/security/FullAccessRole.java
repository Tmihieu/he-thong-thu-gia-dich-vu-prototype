package vn.dongthanh.vsmt.jmixadmin.security;

import io.jmix.security.model.EntityAttributePolicyAction;
import io.jmix.security.model.EntityPolicyAction;
import io.jmix.security.role.annotation.EntityAttributePolicy;
import io.jmix.security.role.annotation.EntityPolicy;
import io.jmix.security.role.annotation.ResourceRole;
import io.jmix.security.role.annotation.SpecificPolicy;
import io.jmix.securityflowui.role.annotation.MenuPolicy;
import io.jmix.securityflowui.role.annotation.ViewPolicy;

/** Mọi tài khoản ADMIN có toàn quyền trong Jmix (đã được lọc ở AdminUserRepository). */
@ResourceRole(name = "Admin toàn quyền", code = FullAccessRole.CODE, scope = "UI")
public interface FullAccessRole {

    String CODE = "vsmt-full-access";

    @EntityPolicy(entityName = "*", actions = EntityPolicyAction.ALL)
    @EntityAttributePolicy(entityName = "*", attributes = "*", action = EntityAttributePolicyAction.MODIFY)
    @SpecificPolicy(resources = "*")
    @ViewPolicy(viewIds = "*")
    @MenuPolicy(menuIds = "*")
    void fullAccess();
}
