package com.budgeats.sg;

import com.budgeats.sg.core.BudgeatsProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties(BudgeatsProperties.class)
public class BudgeatsApplication {

    public static void main(String[] args) {
        SpringApplication.run(BudgeatsApplication.class, args);
    }
}
