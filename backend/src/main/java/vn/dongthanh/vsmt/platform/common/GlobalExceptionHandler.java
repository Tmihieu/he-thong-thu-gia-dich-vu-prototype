package vn.dongthanh.vsmt.platform.common;

import java.util.stream.Collectors;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.NoHandlerFoundException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;

/**
 * Đổi mọi lỗi thành {@link ApiError} {@code {code, message}} với mã HTTP thống nhất:
 * 400 dữ liệu gửi lên sai, 401 chưa đăng nhập, 403 không đủ quyền, 404 không tìm thấy,
 * 409 xung đột, 422 vi phạm quy tắc nghiệp vụ, 500 lỗi hệ thống.
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    public static final String VALIDATION_ERROR = "VALIDATION_ERROR";
    public static final String UNAUTHORIZED = "UNAUTHORIZED";
    public static final String FORBIDDEN = "FORBIDDEN";
    public static final String NOT_FOUND = "NOT_FOUND";
    public static final String CONFLICT = "CONFLICT";
    public static final String INTERNAL_ERROR = "INTERNAL_ERROR";

    @ExceptionHandler(BusinessRuleException.class)
    ResponseEntity<ApiError> businessRule(BusinessRuleException ex) {
        return error(HttpStatus.UNPROCESSABLE_ENTITY, ex.getCode(), ex.getMessage());
    }

    @ExceptionHandler(ConflictException.class)
    ResponseEntity<ApiError> conflict(ConflictException ex) {
        return error(HttpStatus.CONFLICT, ex.getCode(), ex.getMessage());
    }

    @ExceptionHandler({DataIntegrityViolationException.class, OptimisticLockingFailureException.class})
    ResponseEntity<ApiError> dataConflict(RuntimeException ex) {
        log.warn("Xung đột dữ liệu: {}", ex.getMessage());
        return error(HttpStatus.CONFLICT, CONFLICT,
                "Dữ liệu bị trùng hoặc vừa được người khác thay đổi. Vui lòng tải lại và thử lại.");
    }

    @ExceptionHandler(NotFoundException.class)
    ResponseEntity<ApiError> notFound(NotFoundException ex) {
        return error(HttpStatus.NOT_FOUND, ex.getCode(), ex.getMessage());
    }

    @ExceptionHandler({NoResourceFoundException.class, NoHandlerFoundException.class})
    ResponseEntity<ApiError> noResource(Exception ex) {
        return error(HttpStatus.NOT_FOUND, NOT_FOUND, "Không tìm thấy địa chỉ yêu cầu.");
    }

    @ExceptionHandler(AuthenticationException.class)
    ResponseEntity<ApiError> unauthorized(AuthenticationException ex) {
        return error(HttpStatus.UNAUTHORIZED, UNAUTHORIZED, "Bạn cần đăng nhập để thực hiện thao tác này.");
    }

    @ExceptionHandler(AccessDeniedException.class)
    ResponseEntity<ApiError> forbidden(AccessDeniedException ex) {
        return error(HttpStatus.FORBIDDEN, FORBIDDEN, "Bạn không có quyền thực hiện thao tác này.");
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ApiError> invalidBody(MethodArgumentNotValidException ex) {
        String detail = ex.getBindingResult().getFieldErrors().stream()
                .map(GlobalExceptionHandler::describe)
                .collect(Collectors.joining("; "));
        return error(HttpStatus.BAD_REQUEST, VALIDATION_ERROR, "Dữ liệu không hợp lệ: " + detail);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    ResponseEntity<ApiError> invalidParams(ConstraintViolationException ex) {
        String detail = ex.getConstraintViolations().stream()
                .map(v -> v.getPropertyPath() + " " + v.getMessage())
                .collect(Collectors.joining("; "));
        return error(HttpStatus.BAD_REQUEST, VALIDATION_ERROR, "Dữ liệu không hợp lệ: " + detail);
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class,
            MissingServletRequestParameterException.class})
    ResponseEntity<ApiError> unreadable(Exception ex) {
        return error(HttpStatus.BAD_REQUEST, VALIDATION_ERROR, "Dữ liệu gửi lên sai định dạng hoặc thiếu tham số.");
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ApiError> unexpected(Exception ex) {
        log.error("Lỗi không mong đợi", ex);
        return error(HttpStatus.INTERNAL_SERVER_ERROR, INTERNAL_ERROR, "Hệ thống gặp lỗi. Vui lòng thử lại sau.");
    }

    private static String describe(FieldError fe) {
        return fe.getField() + " " + fe.getDefaultMessage();
    }

    private static ResponseEntity<ApiError> error(HttpStatus status, String code, String message) {
        return ResponseEntity.status(status).body(new ApiError(code, message));
    }
}
