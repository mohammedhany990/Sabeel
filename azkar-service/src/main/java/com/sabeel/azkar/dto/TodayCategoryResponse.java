package com.sabeel.azkar.dto;

import java.util.List;

public record TodayCategoryResponse(String code, String nameEn, String nameAr, int completedItems, int totalItems,
                                    boolean complete, List<ItemResponse> items) {
}
