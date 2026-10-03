package vn.dongthanh.vsmt.jmixadmin.view.login;

import com.vaadin.flow.component.login.AbstractLogin.LoginEvent;
import com.vaadin.flow.router.Route;
import io.jmix.flowui.component.loginform.JmixLoginForm;
import io.jmix.flowui.view.StandardView;
import io.jmix.flowui.view.Subscribe;
import io.jmix.flowui.view.ViewComponent;
import io.jmix.flowui.view.ViewController;
import io.jmix.flowui.view.ViewDescriptor;
import io.jmix.securityflowui.authentication.AuthDetails;
import io.jmix.securityflowui.authentication.LoginViewSupport;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;

@Route(value = "login")
@ViewController("LoginView")
@ViewDescriptor("login-view.xml")
public class LoginView extends StandardView {

    @Autowired
    private LoginViewSupport loginViewSupport;

    @ViewComponent
    private JmixLoginForm login;

    /** Tài khoản demo điền sẵn; để trống (JMIX_DEMO_USERNAME=) khi chạy với dữ liệu thật. */
    @Value("${vsmt.login.default-username:}")
    private String defaultUsername;

    @Value("${vsmt.login.default-password:}")
    private String defaultPassword;

    @Subscribe
    public void onInit(final InitEvent event) {
        if (!defaultUsername.isBlank()) {
            login.setUsername(defaultUsername);
            login.setPassword(defaultPassword);
        }
    }

    @Subscribe("login")
    public void onLogin(final LoginEvent event) {
        try {
            loginViewSupport.authenticate(AuthDetails.of(event.getUsername(), event.getPassword()));
        } catch (final BadCredentialsException | DisabledException | LockedException | AccessDeniedException e) {
            event.getSource().setError(true);
        }
    }
}
