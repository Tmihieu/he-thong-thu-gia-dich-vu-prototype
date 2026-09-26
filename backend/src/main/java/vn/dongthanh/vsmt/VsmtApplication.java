package vn.dongthanh.vsmt;

import java.util.TimeZone;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class VsmtApplication {

    public static final String TIME_ZONE = "Asia/Ho_Chi_Minh";

    public static void main(String[] args) {
        TimeZone.setDefault(TimeZone.getTimeZone(TIME_ZONE));
        SpringApplication.run(VsmtApplication.class, args);
    }
}
