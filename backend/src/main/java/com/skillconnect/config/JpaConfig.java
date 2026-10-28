package com.skillconnect.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@Configuration
@EnableJpaRepositories(basePackages = "com.skillconnect.repository", considerNestedRepositories = true)
public class JpaConfig {
}
