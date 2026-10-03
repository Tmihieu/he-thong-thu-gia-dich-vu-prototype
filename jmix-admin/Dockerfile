# Jmix Admin: build Vaadin production bằng Gradle wrapper (cần Node; Vaadin tự tải Node nếu thiếu).
FROM eclipse-temurin:21-jdk AS build
WORKDIR /src
COPY . .
RUN --mount=type=cache,target=/root/.gradle sh ./gradlew -Pvaadin.productionMode=true bootJar --no-daemon -x test

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /src/build/libs/*.jar app.jar
EXPOSE 8081
ENTRYPOINT ["java", "-jar", "app.jar"]
