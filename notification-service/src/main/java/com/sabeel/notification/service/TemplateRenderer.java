package com.sabeel.notification.service;

import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class TemplateRenderer {
    public String render(String template, Map<String, String> values) {
        String result = template;
        for (Map.Entry<String, String> entry : values.entrySet()) {
            result = result.replace("{" + entry.getKey() + "}", entry.getValue());
        }
        return result;
    }
}
