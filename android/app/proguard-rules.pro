# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# --- Capacitor / Cordova bridge (reflection-based plugin loading) ---
-keep public class * extends com.getcapacitor.Plugin
-keep @com.getcapacitor.annotation.CapacitorPlugin public class * { *; }
-keepclassmembers class * {
  @com.getcapacitor.annotation.CapacitorPlugin *;
  @com.getcapacitor.PluginMethod public *;
}
-keep public class * extends org.apache.cordova.CordovaPlugin

# JavascriptInterface methods exposed to the WebView
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Capacitor core + plugins
-keep class com.getcapacitor.** { *; }
-keep class com.hugo.rewards.** { *; }
-keep class io.capacitor.** { *; }
-keep class com.capacitorjs.** { *; }
-dontwarn org.apache.cordova.**

# Keep annotations / generics / source info for readable crash reports
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
