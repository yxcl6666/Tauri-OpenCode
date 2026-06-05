use tauri::command;

#[cfg(target_os = "android")]
#[command]
fn start_termux_backend(app_handle: tauri::AppHandle) -> Result<String, String> {
    use jni::objects::JValue;
    
    // 获取 JNI 运行环境与当前的 Activity 实例
    let env = app_handle.android_app().create_env().map_err(|e| e.to_string())?;
    let activity = app_handle.android_app().activity();

    // 定义内部闭包以便集中进行 JNI 异常清理
    let run_jni = |env: &jni::JNIEnv, activity: &jni::objects::JObject| -> Result<String, String> {
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

        // 3. 在当前 Context 下调用 startService(Intent) 启动 Termux 对应的服务
        let component_name = env.call_method(
            activity,
            "startService",
            "(Landroid/content/Intent;)Landroid/content/ComponentName;",
            &[JValue::Object(&intent)]
        ).map_err(|e| e.to_string())?;

        // 4. 校验返回值以检测 Termux 是否未安装或不支持该 Intent
        if let JValue::Object(obj) = component_name {
            if obj.is_null() {
                return Err("未检测到 Termux 客户端，或者 Termux 尚未开启“允许外部应用运行命令”权限。".into());
            }
        }

        Ok("Termux backend wake command sent successfully".into())
    };

    match run_jni(&env, &activity) {
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
    }
}

#[cfg(not(target_os = "android"))]
#[command]
fn start_termux_backend() -> Result<String, String> {
    Ok("Mock call: not running on Android, Termux wakeup skipped".into())
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
    .invoke_handler(tauri::generate_handler![start_termux_backend])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
