use tauri::command;

#[cfg(target_os = "android")]
#[command]
fn start_termux_backend(app_handle: tauri::AppHandle) -> Result<String, String> {
    use jni::objects::JValue;
    use tauri::Manager;
    use std::sync::mpsc::channel;

    // 1. 获取主 WebView 窗口
    let webview_window = app_handle.get_webview_window("main")
        .ok_or_else(|| "Failed to find main webview window".to_string())?;

    // 2. 创建通信管道，用于把在 JNI 线程执行的结果发回当前线程
    let (tx, rx) = channel();

    // 3. 进入 WebView 的主平台窗口环境执行
    webview_window.with_webview(move |webview| {
        // exec 方法提供了 &JNIEnv, Context (Activity JObject) 和 _webview
        webview.jni_handle().exec(move |mut env, context, _webview| {
            
            // 定义内部逻辑，以便统一处理 JNI 异常清理
            let run_jni = |env: &mut jni::JNIEnv, activity: &jni::objects::JObject| -> Result<String, String> {
                // 1. 查找 Intent 类并创建意图实例，指定 ACTION_RUN_COMMAND (com.termux.RUN_COMMAND)
                let intent_class = env.find_class("android/content/Intent").map_err(|e| e.to_string())?;
                let action_str = env.new_string("com.termux.RUN_COMMAND").map_err(|e| e.to_string())?;
                let intent = env.new_object(
                    &intent_class,
                    "(Ljava/lang/String;)V",
                    &[JValue::Object(&action_str)],
                ).map_err(|e| e.to_string())?;

                // 2. 配置附加参数 (Intent Extras)
                let extra_path_key = env.new_string("com.termux.RUN_COMMAND_PATH").map_err(|e| e.to_string())?;
                let extra_path_val = env.new_string("/data/data/com.termux/files/home/start-opencode.sh").map_err(|e| e.to_string())?;
                
                let extra_bg_key = env.new_string("com.termux.RUN_COMMAND_BACKGROUND").map_err(|e| e.to_string())?;
                
                env.call_method(
                    &intent,
                    "putExtra",
                    "(Ljava/lang/String;Ljava/lang/String;)Landroid/content/Intent;",
                    &[JValue::Object(&extra_path_key), JValue::Object(&extra_path_val)]
                ).map_err(|e| e.to_string())?;
                
                env.call_method(
                    &intent,
                    "putExtra",
                    "(Ljava/lang/String;Z)Landroid/content/Intent;",
                    &[JValue::Object(&extra_bg_key), JValue::Bool(1)] // true
                ).map_err(|e| e.to_string())?;

                // 3. 在当前 Context (Activity) 下调用 startService(Intent) 启动 Termux 对应的服务
                let component_name_val = env.call_method(
                    activity,
                    "startService",
                    "(Landroid/content/Intent;)Landroid/content/ComponentName;",
                    &[JValue::Object(&intent)]
                ).map_err(|e| e.to_string())?;

                // 4. 提取返回的 ComponentName 对象并校验是否为 null
                let component_obj = component_name_val.l().map_err(|e| e.to_string())?;
                if component_obj.is_null() {
                    return Err("未检测到 Termux 客户端，或者 Termux 尚未开启“允许外部应用运行命令”权限。".into());
                }

                Ok("Termux backend wake command sent successfully".into())
            };

            // 执行 JNI 并发回结果
            let run_res = match run_jni(&mut env, context) {
                Ok(msg) => Ok(msg),
                Err(e) => {
                    // 清理挂起的 JNI 异常，防止 JVM 线程状态污染
                    if let Ok(has_exception) = env.exception_check() {
                        if has_exception {
                            let _ = env.exception_clear();
                        }
                    }
                    Err(e)
                }
            };
            let _ = tx.send(run_res);
        });
    }).map_err(|e| e.to_string())?;

    // 4. 阻塞等待 JNI 执行结果并返回给前端
    rx.recv().map_err(|e| e.to_string())?
}

#[cfg(target_os = "android")]
#[command]
fn open_termux_app(app_handle: tauri::AppHandle) -> Result<String, String> {
    use tauri::Manager;
    use std::sync::mpsc::channel;

    let webview_window = app_handle.get_webview_window("main")
        .ok_or_else(|| "Failed to find main webview window".to_string())?;
    let (tx, rx) = channel();

    webview_window.with_webview(move |webview| {
        webview.jni_handle().exec(move |mut env, context, _webview| {
            let run_jni = |env: &mut jni::JNIEnv, activity: &jni::objects::JObject| -> Result<String, String> {
                // 1. 查找并创建 Intent: new Intent()
                let intent_class = env.find_class("android/content/Intent").map_err(|e| e.to_string())?;
                let intent = env.new_object(&intent_class, "()V", &[]).map_err(|e| e.to_string())?;

                // 2. 构造 ComponentName: new ComponentName("com.termux", "com.termux.app.TermuxActivity")
                let comp_class = env.find_class("android/content/ComponentName").map_err(|e| e.to_string())?;
                let pkg_str = env.new_string("com.termux").map_err(|e| e.to_string())?;
                let cls_str = env.new_string("com.termux.app.TermuxActivity").map_err(|e| e.to_string())?;
                let component = env.new_object(
                    &comp_class,
                    "(Ljava/lang/String;Ljava/lang/String;)V",
                    &[jni::objects::JValue::Object(&pkg_str), jni::objects::JValue::Object(&cls_str)]
                ).map_err(|e| e.to_string())?;

                // 3. intent.setComponent(component)
                env.call_method(
                    &intent,
                    "setComponent",
                    "(Landroid/content/ComponentName;)Landroid/content/Intent;",
                    &[jni::objects::JValue::Object(&component)]
                ).map_err(|e| e.to_string())?;

                // 4. intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK) -> 0x10000000 (268435456)
                env.call_method(
                    &intent,
                    "addFlags",
                    "(I)Landroid/content/Intent;",
                    &[jni::objects::JValue::Int(268435456)]
                ).map_err(|e| e.to_string())?;

                // 5. activity.startActivity(intent)
                env.call_method(
                    activity,
                    "startActivity",
                    "(Landroid/content/Intent;)V",
                    &[jni::objects::JValue::Object(&intent)]
                ).map_err(|e| e.to_string())?;

                Ok("Successfully launched Termux app to foreground".into())
            };

            let run_res = match run_jni(&mut env, context) {
                Ok(msg) => Ok(msg),
                Err(e) => {
                    if let Ok(has_exception) = env.exception_check() {
                        if has_exception {
                            let _ = env.exception_clear();
                        }
                    }
                    Err(e)
                }
            };
            let _ = tx.send(run_res);
        });
    }).map_err(|e| e.to_string())?;

    rx.recv().map_err(|e| e.to_string())?
}

#[cfg(target_os = "android")]
#[command]
fn open_termux_settings(app_handle: tauri::AppHandle) -> Result<String, String> {
    use tauri::Manager;
    use std::sync::mpsc::channel;

    let webview_window = app_handle.get_webview_window("main")
        .ok_or_else(|| "Failed to find main webview window".to_string())?;
    let (tx, rx) = channel();

    webview_window.with_webview(move |webview| {
        webview.jni_handle().exec(move |mut env, context, _webview| {
            let run_jni = |env: &mut jni::JNIEnv, activity: &jni::objects::JObject| -> Result<String, String> {
                // 1. 查找 Intent 类与创建 ACTION_APPLICATION_DETAILS_SETTINGS 意图
                let intent_class = env.find_class("android/content/Intent").map_err(|e| e.to_string())?;
                let settings_action = env.new_string("android.settings.APPLICATION_DETAILS_SETTINGS").map_err(|e| e.to_string())?;
                let intent = env.new_object(
                    &intent_class,
                    "(Ljava/lang/String;)V",
                    &[jni::objects::JValue::Object(&settings_action)],
                ).map_err(|e| e.to_string())?;

                // 2. 构造 Uri: Uri.parse("package:com.termux")
                let uri_class = env.find_class("android/net/Uri").map_err(|e| e.to_string())?;
                let package_uri_str = env.new_string("package:com.termux").map_err(|e| e.to_string())?;
                let uri_val = env.call_static_method(
                    &uri_class,
                    "parse",
                    "(Ljava/lang/String;)Landroid/net/Uri;",
                    &[jni::objects::JValue::Object(&package_uri_str)]
                ).map_err(|e| e.to_string())?;
                let uri = uri_val.l().map_err(|e| e.to_string())?;

                // 3. intent.setData(uri)
                env.call_method(
                    &intent,
                    "setData",
                    "(Landroid/net/Uri;)Landroid/content/Intent;",
                    &[jni::objects::JValue::Object(&uri)]
                ).map_err(|e| e.to_string())?;

                // 4. activity.startActivity(intent)
                env.call_method(
                    activity,
                    "startActivity",
                    "(Landroid/content/Intent;)V",
                    &[jni::objects::JValue::Object(&intent)]
                ).map_err(|e| e.to_string())?;

                Ok("Successfully opened Termux application settings".into())
            };

            let run_res = match run_jni(&mut env, context) {
                Ok(msg) => Ok(msg),
                Err(e) => {
                    if let Ok(has_exception) = env.exception_check() {
                        if has_exception {
                            let _ = env.exception_clear();
                        }
                    }
                    Err(e)
                }
            };
            let _ = tx.send(run_res);
        });
    }).map_err(|e| e.to_string())?;

    rx.recv().map_err(|e| e.to_string())?
}

#[cfg(not(target_os = "android"))]
#[command]
fn start_termux_backend() -> Result<String, String> {
    Ok("Mock call: not running on Android, Termux wakeup skipped".into())
}

#[cfg(not(target_os = "android"))]
#[command]
fn open_termux_app() -> Result<String, String> {
    Ok("Mock call: not running on Android, Termux launch skipped".into())
}

#[cfg(not(target_os = "android"))]
#[command]
fn open_termux_settings() -> Result<String, String> {
    Ok("Mock call: not running on Android, Termux settings skipped".into())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      start_termux_backend,
      open_termux_app,
      open_termux_settings
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
