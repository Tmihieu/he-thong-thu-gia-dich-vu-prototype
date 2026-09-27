# Đóng gói jar bằng Maven wrapper; test chạy riêng ngoài image (./mvnw verify).
FROM eclipse-temurin:21-jdk AS build
WORKDIR /src
COPY . .
# mvnw lưu trong git không có quyền thực thi nên gọi qua sh; cache ~/.m2 để build lại không tải lại thư viện.
RUN --mount=type=cache,target=/root/.m2 sh ./mvnw -B -ntp package -DskipTests

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /src/target/*.jar app.jar
# Profile demo nạp thêm seed dữ liệu giả (db/seed), giống ./mvnw spring-boot:run.
ENV SPRING_PROFILES_ACTIVE=demo
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
