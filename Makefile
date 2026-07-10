.PHONY: cap-android-smoke

cap-android-smoke:
	npx cap sync android
	cd android && ./gradlew assembleDebug
