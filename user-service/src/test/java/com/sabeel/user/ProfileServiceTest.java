package com.sabeel.user;

import com.sabeel.user.domain.NotificationPreference;
import com.sabeel.user.domain.Profile;
import com.sabeel.user.dto.PreferencesRequest;
import com.sabeel.user.event.OutboxService;
import com.sabeel.user.repository.DeviceTokenRepository;
import com.sabeel.user.repository.NotificationPreferenceRepository;
import com.sabeel.user.repository.ProfileRepository;
import com.sabeel.user.service.ProfileService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class ProfileServiceTest {
    private NotificationPreferenceRepository preferenceRepository;
    private OutboxService outboxService;
    private ProfileService service;
    private final UUID userId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        ProfileRepository profileRepository = mock(ProfileRepository.class);
        preferenceRepository = mock(NotificationPreferenceRepository.class);
        outboxService = mock(OutboxService.class);
        service = new ProfileService(profileRepository, preferenceRepository,
                mock(DeviceTokenRepository.class), outboxService);
        Profile profile = Profile.builder().userId(userId).name("A").timezone("Africa/Cairo").build();
        when(profileRepository.findById(userId)).thenReturn(Optional.of(profile));
    }

    @Test
    void preferencesEventCarriesPrayerAndAzkarToggles() {
        NotificationPreference prefs = NotificationPreference.builder().userId(userId)
                .pushEnabled(true).emailEnabled(true).prayerReminders(true).azkarReminders(true).build();
        when(preferenceRepository.findById(userId)).thenReturn(Optional.of(prefs));
        when(preferenceRepository.save(any(NotificationPreference.class))).thenAnswer(inv -> inv.getArgument(0));
        service.updatePreferences(userId, new PreferencesRequest(null, null, null, null, false, false));
        verify(outboxService).record(eq("user.preferences.updated"), eq(userId.toString()), argThat(p -> {
            Map<?, ?> map = (Map<?, ?>) p;
            return Boolean.FALSE.equals(map.get("prayerReminders")) && Boolean.FALSE.equals(map.get("azkarReminders"));
        }));
    }

    @Test
    void enabledTogglesArePublishedAsTrue() {
        NotificationPreference prefs = NotificationPreference.builder().userId(userId)
                .pushEnabled(true).emailEnabled(true).prayerReminders(true).azkarReminders(true).build();
        when(preferenceRepository.findById(userId)).thenReturn(Optional.of(prefs));
        when(preferenceRepository.save(any(NotificationPreference.class))).thenAnswer(inv -> inv.getArgument(0));
        service.updatePreferences(userId, new PreferencesRequest(null, null, null, null, null, null));
        verify(outboxService).record(eq("user.preferences.updated"), eq(userId.toString()), argThat(p -> {
            Map<?, ?> map = (Map<?, ?>) p;
            return Boolean.TRUE.equals(map.get("prayerReminders")) && Boolean.TRUE.equals(map.get("azkarReminders"));
        }));
    }
}
