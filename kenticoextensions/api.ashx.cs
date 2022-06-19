using CMS.Base;
using CMS.DataEngine;
using CMS.EventLog;
using CMS.Helpers;
using CMS.Localization;
using CMS.MediaLibrary;
using CMS.Membership;
using CMS.Modules;
using CMS.OnlineForms;
using CMS.Reporting;
using CMS.SiteProvider;
using CMS.Synchronization;
using KenticoExtensions.Helpers;
using KenticoExtensions.Models;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;
using System;
using System.Collections;
using System.Collections.Generic;
using System.Data;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Web;
using System.Web.SessionState;


public class kenticoextensionshandler : IHttpHandler, IRequiresSessionState
{
    // Thes constants are client specific!
    const string customObjectPrefix = "Custom."; // used to filter te class schema data
    const string customReportsPrefix = "Reporting_Custom"; // used to filter the report data

    HttpContext context = null;
    CurrentUserInfo currentUser = null;
    string dataParam = string.Empty;

    bool refreshData = false;
    bool applyCompression = true;
    bool showError = false;
    bool clientCache = true;

    ContentResponse contentResponse = null;
    string responseBody = string.Empty;

    public void ProcessRequest(HttpContext httpContext)
    {
        context = httpContext;
        var requestDateTime = DateTime.Now;

        var handleRequest = true;
        var attempts = 1;
        while (handleRequest == true && attempts <= 2)
        {
            handleRequest = false;
            try
            {
                HandleRequest();
            }
            catch (Exception ex)
            {
                if (ex.Message.Contains("cannot be cast to"))
                {
                    CacheHelper.TouchKey("dummy|kenticoextensions");
                    handleRequest = true;
                    attempts++;
                }
                else
                {
                    if (showError)
                    {
                        responseBody = string.Format("Exception<br/><p><strong>Message: </strong>{0}<br/><strong>Source: </strong>{1}<br/><strong>Stack Trace: </strong>{2}</p>", ex.Message, ex.Source, ex.StackTrace);
                        WriteResponse(500, responseBody, true);
                    }
                    else
                    {
                        WriteResponse(500, "An internal error occured.");
                    }
                }
            }
        }
    }

    private void HandleRequest()
    {
        if (ValidRequest() == false)
            return;

        currentUser = MembershipContext.AuthenticatedUser;
        if (IsAuthenitcatedCMSUser() == false)
        {
            WriteResponse(403, "The Kentico Extensions API only accepts authenticated requests.");
            return;
        }

        var resource = string.Empty;
        if (GetStringParam("resource", ref resource) != false)
        {
            switch (resource.ToLower())
            {
                case "javascript":
                    ProcessJavaScript();
                    break;
                case "stylesheet":
                    ProcessStyleSheet();
                    break;
                default:
                    WriteResponse(501, resource + " resource not found.");
                    return;
            }
            return;
        }

        switch (dataParam.ToLower())
        {
            // TEST ENDPOINTS
            case "test":
                ProcessTest();
                break;
            case "testerror":
                ProcessTestError();
                break;

            //DATA ENDPOINTS
            case "session":
                ProcessGetSession();
                break;
            case "configuration":
                ProcessGetConfiguration();
                break;
            case "treeinfo":
                ProcessGetTreeInfo();
                break;
            case "documentinfo":
                ProcessGetDocumentInfo();
                break;
            case "settingsbycategoryname":
                ProcessGetSettingsByCategoryName();
                break;
            case "shortcutbaritems":
                ProcessGetShortcutBarItems();
                break;
            case "userroles":
                ProcessGetUserRoles();
                break;
            case "stagingtasks":
                ProcessStagingTasks();
                break;
            case "stagingusers":
                ProcessStagingUsers();
                break;
            case "mediafileinfo":
                ProcessMediaFileInfo();
                break;
            case "sites":
                ProcessGetSites();
                break;
            case "pagetypes":
                ProcessGetPageTypes();
                break;
            case "customtables":
                ProcessGetCustomTables();
                break;
            case "moduleclasses":
                ProcessGetModuleClasses();
                break;
            case "forms":
                ProcessGetForms();
                break;

            case "databasetables":
                ProcessGetDatabaseTables();
                break;
            case "databasetableschema":
                ProcessGetDatabaseTableSchema();
                break;
            case "classschema":
                ProcessGetClassSchema();
                break;
            case "settingkeys":
                ProcessGetSettingKeys();
                break;
            case "executequery":
                ProcessExecuteQuery();
                break;
            case "mediafiles":
                ProcessGetMediaFiles();
                break;
            case "reports":
                ProcessGetReports();
                break;
            case "treedata":
                ProcessGetTreeData();
                break;

            // OTHER ENDPOINTS
            case "cachelist":
                ProcessGetCacheList();
                break;
            case "teapot":
                WriteResponse(418, "Yep, we implemented it :)");
                break;
            case "endpoints":
                ProcessGetEndpoints();
                break;
            default:
                WriteResponse(501, dataParam + " data has not been implemented.");
                return;
        }
    }

    private bool ValidRequest()
    {
        if (GetStringParam("resource", ref dataParam) == false && GetStringParam("data", ref dataParam) == false)
        {
            WriteResponse(400, "Kentico Extensions API requires a resource or data query string parameter.");
            return false;
        }

        var refreshDataResult = GetBoolParam("refreshdata", ref refreshData);
        if (QueryHelper.GetString("refreshdata", string.Empty) != string.Empty && refreshDataResult == false)
        {
            WriteResponse(400, "The refreshdata query string parameter is not a valid boolean value.");
            return false;
        }
        if (QueryHelper.GetString("refreshdata", string.Empty) == string.Empty || refreshDataResult == false)
        {
            refreshData = false;
        }

        var compressionDataResult = GetBoolParam("compression", ref applyCompression);
        if (QueryHelper.GetString("compression", string.Empty) != string.Empty && compressionDataResult == false)
        {
            WriteResponse(400, "The compression query string parameter is not a valid boolean value.");
            return false;
        }
        if (QueryHelper.GetString("compression", string.Empty) == string.Empty || compressionDataResult == false)
        {
            applyCompression = false;
        }

        var showErrorResult = GetBoolParam("showerror", ref showError);
        if (QueryHelper.GetString("showerror", string.Empty) != string.Empty && showErrorResult == false)
        {
            WriteResponse(400, "The showerror query string parameter is not a valid boolean value.");
            return false;
        }
        if (QueryHelper.GetString("showerror", string.Empty) == string.Empty || showErrorResult == false)
        {
            showError = false;
        }

        var clientCacheResult = GetBoolParam("clientcache", ref clientCache);
        if (QueryHelper.GetString("clientcache", string.Empty) != string.Empty && clientCacheResult == false)
        {
            WriteResponse(400, "The clientcache query string parameter is not a valid boolean value.");
            return false;
        }
        if (QueryHelper.GetString("clientcache", string.Empty) == string.Empty || clientCacheResult == false)
        {
            clientCache = true;
        }

        return true;
    }

    private bool IsAuthenitcatedCMSUser()
    {
        var privilegeLevel = MembershipContext.AuthenticatedUser.SiteIndependentPrivilegeLevel;

        var isAuthenticated = (privilegeLevel == UserPrivilegeLevelEnum.GlobalAdmin
            || privilegeLevel == UserPrivilegeLevelEnum.Admin
            || privilegeLevel == UserPrivilegeLevelEnum.Editor);

        return isAuthenticated;
    }

    private bool IsGlobalAdmin => MembershipContext.AuthenticatedUser.CheckPrivilegeLevel(UserPrivilegeLevelEnum.GlobalAdmin);

    private bool GetStringParam(string param, ref string value)
    {
        var paramValue = context.Request.Params[param];
        if (paramValue == null || string.IsNullOrEmpty(paramValue))
            return false;

        value = paramValue.ToString();
        return true;
    }

    private bool GetBoolParam(string param, ref bool value)
    {
        var paramValue = context.Request.Params[param];
        if (paramValue == null)
            return false;

        return bool.TryParse(paramValue, out value);
    }

    private bool GetIntParam(string param, ref int value)
    {
        var paramValue = context.Request.Params[param];
        if (paramValue == null)
            return false;

        return int.TryParse(paramValue, out value);
    }

    private bool GetGUIDParam(string param, ref Guid value)
    {
        var paramValue = context.Request.Params[param];
        if (paramValue == null)
            return false;

        return Guid.TryParse(paramValue, out value);
    }

    private void ProcessStyleSheet()
    {
        var filePath = @"\kenticoextensions\kenticoextensions.css";
        CheckResourceCache(filePath);
        if (context.Response.StatusCode == 304)
            return;

        var fileContents = GetFileContents(filePath);
        context.Response.ContentType = "text/css";
        context.Response.Write(fileContents);
    }

    private void ProcessJavaScript()
    {
        var filePath = @"\kenticoextensions\kenticoextensions.js";
        CheckResourceCache(filePath);
        if (context.Response.StatusCode == 304)
            return;

        var fileContents = GetFileContents(filePath);
        context.Response.ContentType = "application/javascript";
        context.Response.Write(fileContents);
    }

    private string GetFileContents(string filePath)
    {
        var fullFilePath = HttpContext.Current.Server.MapPath("~") + filePath;
        var fileContents = string.Empty;
        if (File.Exists(fullFilePath) == true)
        {
            fileContents = File.ReadAllText(fullFilePath);
        }
        return fileContents;
    }

    private DateTime GetFileLastModified(string filePath)
    {
        var fullFilePath = HttpContext.Current.Server.MapPath("~") + filePath;
        var lastModified = DateTime.MinValue;
        if (File.Exists(fullFilePath) == true)
        {
            var fi = new FileInfo(fullFilePath);
            lastModified = fi.LastWriteTime;
        }
        return lastModified;
    }

    private void CheckResourceCache(string filePath)
    {
        context.Response.Cache.SetCacheability(System.Web.HttpCacheability.NoCache);
        context.Response.Cache.SetMaxAge(new TimeSpan(1, 0, 0));

        string rawIfModifiedSince = context.Request.Headers.Get("If-Modified-Since");
        var lastModified = GetFileLastModified(filePath);
        if (string.IsNullOrEmpty(rawIfModifiedSince))
        {
            context.Response.Cache.SetLastModified(lastModified);
        }
        else
        {
            DateTime ifModifiedSince = DateTime.Parse(rawIfModifiedSince);
            if (lastModified.ToString() == ifModifiedSince.ToString())
            {
                context.Response.StatusCode = 304;
                return;
            }
        }
    }

    private void ProcessTest()
    {
        WriteResponse(200, "Test Complete", true);
    }

    private void ProcessTestError()
    {
        throw new Exception("This is a test exception!");
    }

    private void ProcessGetSession()
    {
        var cacheItemName = string.Format("kenticoextensions|session|userid={0}", currentUser.UserID);
        if (refreshData)
            CacheHelper.TouchKey($"dummy|{cacheItemName}");

        contentResponse = CacheHelper.Cache(cs => GetSessionData(cs), new CacheSettings(60, cacheItemName));

        UpdateCacheList(contentResponse);
        WriteResponse(contentResponse);
    }

    private ContentResponse GetSessionData(CacheSettings cs)
    {
        var sessionData = new SessionData();
        sessionData.SessionID = context.Session.SessionID;
        sessionData.ASPNETFormsAuth = context.Request.Cookies[".ASPXFORMSAUTH"].Value;
        sessionData.UserID = MembershipContext.AuthenticatedUser.UserID;
        sessionData.UserGUID = MembershipContext.AuthenticatedUser.UserGUID;
        sessionData.UserName = MembershipContext.AuthenticatedUser.UserName;
        sessionData.GlobalAdmin = IsGlobalAdmin;
        sessionData.PreferredUICultureCode = MembershipContext.AuthenticatedUser.PreferredUICultureCode;

        var clientKey = GetClientKey();
        var contentResponse = new ContentResponse(clientKey, cs.CacheItemName, sessionData);

        if (cs.Cached)
        {
            var cacheKeyList = new List<string>();
            cacheKeyList.Add("dummy|kenticoextensions");
            cacheKeyList.Add("dummy|" + cs.CacheItemName);
            cs.CacheDependency = CacheHelper.GetCacheDependency(cacheKeyList);
        }

        return contentResponse;
    }

    private void ProcessGetUserRoles()
    {
        var cacheItemName = string.Format("kenticoextensions|userroles|userid={0}", currentUser.UserID);
        if (refreshData)
            CacheHelper.TouchKey($"dummy|{cacheItemName}");

        contentResponse = CacheHelper.Cache(cs => GetUserRoles(cs), new CacheSettings(60, cacheItemName));

        UpdateCacheList(contentResponse);
        WriteResponse(contentResponse);
    }

    private ContentResponse GetUserRoles(CacheSettings cs)
    {
        var dtRoles = UserInfoProvider.GetUserRoles(currentUser);

        List<string> rolesList = new List<string>();
        foreach (DataRow dr in dtRoles.Rows)
        {
            if (dr["RoleName"].ToString().StartsWith("_") && dr["RoleName"].ToString().EndsWith("_"))
                continue;
            else
                rolesList.Add(dr["RoleDisplayName"].ToString());
        }

        var clientKey = GetClientKey();
        var contentResponse = new ContentResponse(clientKey, cs.CacheItemName, dtRoles);

        if (cs.Cached)
        {
            var cacheKeyList = new List<string>();
            cacheKeyList.Add($"{RoleInfo.OBJECT_TYPE}|all");
            cacheKeyList.Add("dummy|kenticoextensions");
            cacheKeyList.Add("dummy|" + cs.CacheItemName);
            cs.CacheDependency = CacheHelper.GetCacheDependency(cacheKeyList);
        }

        return contentResponse;
    }

    private void ProcessGetTreeInfo()
    {
        var cacheItemName = string.Format("kenticoextensions|treeinfo|siteid={0}&culture={1}", SiteContext.CurrentSiteID, LocalizationContext.PreferredCultureCode);
        if (refreshData)
            CacheHelper.TouchKey($"dummy|{cacheItemName}");

        contentResponse = CacheHelper.Cache(cs => GetTreeInfo(cs), new CacheSettings(60, cacheItemName));

        UpdateCacheList(contentResponse);
        WriteResponse(contentResponse);
    }

    private ContentResponse GetTreeInfo(CacheSettings cs)
    {
        var treeItemList = new List<TreeItem>();

        GeneralConnection gc = ConnectionHelper.GetConnection();
        string queryString = @"SELECT T.NodeName, T.NodeID, T.NodeGUID, T.NodeAliasPath,  
                                D.DocumentID, D.DocumentGUID,
                                C.ClassDisplayName, C.ClassName,
                                PTC.PageTemplateConfigurationName AS PageTemplateDisplayName,
                                JSON_VALUE(IIF(d.DocumentPageTemplateConfiguration = '', NULL, d.DocumentPageTemplateConfiguration), '$.identifier') AS PageTemplateCodeName
                                FROM CMS_Tree T
                                INNER JOIN CMS_Class C ON T.NodeClassID = C.ClassID
                                INNER JOIN CMS_Document D ON ISNULL(T.NodeLinkedNodeID, T.NodeID) = D.DocumentNodeID
                                LEFT OUTER JOIN CMS_PageTemplateConfiguration PTC ON 
                                JSON_VALUE(IIF(d.DocumentPageTemplateConfiguration = '', NULL, d.DocumentPageTemplateConfiguration), '$.identifier') = JSON_VALUE(PTC.PageTemplateConfigurationTemplate, '$.identifier')
                                WHERE T.NodeSiteID = @SiteID";

        QueryDataParameters qdp = new QueryDataParameters();
        qdp.Add(new DataParameter("SiteID", SiteContext.CurrentSiteID));

        QueryParameters qp = new QueryParameters(queryString, qdp, QueryTypeEnum.SQLQuery);

        DataSet ds = gc.ExecuteQuery(qp);

        if (ds.Tables.Count != 0 || ds.Tables[0].Rows.Count != 0)
        {
            foreach (DataRow dr in ds.Tables[0].Rows)
            {
                treeItemList.Add(new TreeItem(dr));
            }
        }

        var clientKey = GetClientKey();
        var contentResponse = new ContentResponse(clientKey, cs.CacheItemName, treeItemList);

        if (cs.Cached)
        {
            var cacheKeyList = new List<string>();
            cacheKeyList.Add(String.Format("node|{0}|/|childnodes", SiteContext.CurrentSiteName));
            cacheKeyList.Add("dummy|kenticoextensions");
            cacheKeyList.Add("dummy|" + cs.CacheItemName);
            cs.CacheDependency = CacheHelper.GetCacheDependency(cacheKeyList);
        }

        return contentResponse;
    }

    private void ProcessGetDocumentInfo()
    {
        var nodeid = 0;
        if (GetIntParam("nodeid", ref nodeid) == false)
        {
            WriteResponse(500, "Query string parameter nodeid is required.");
            return;
        }

        var cacheItemName = string.Format("kenticoextensions|documentinfo|nodeid={0}", nodeid);
        if (refreshData)
            CacheHelper.TouchKey($"dummy|{cacheItemName}");

        contentResponse = CacheHelper.Cache(cs => GetDocumentInfo(cs, nodeid), new CacheSettings(60, cacheItemName));

        UpdateCacheList(contentResponse);
        WriteResponse(contentResponse);
    }

    private ContentResponse GetDocumentInfo(CacheSettings cs, int nodeid)
    {
        GeneralConnection gc = ConnectionHelper.GetConnection();
        string queryString = @"SELECT T.NodeID, T.NodeGUID, T.NodeAliasPath,
                                D.DocumentID, D.DocumentGUID, D.DocumentCulture,
                                D.DocumentCreatedByUserID, IIF(ISNULL(CU.FullName, '') = '', CU.UserName, CU.FullName) AS DocumentCreatedBy, D.DocumentCreatedWhen,
                                D.DocumentModifiedByUserID, IIF(ISNULL(MU.FullName, '') = '', MU.UserName, MU.FullName) AS DocumentModifiedBy, D.DocumentModifiedWhen
                                FROM CMS_Tree T
                                INNER JOIN CMS_Document D ON (T.NodeID = D.DocumentNodeID OR T.NodeLinkedNodeID = D.DocumentNodeID)
                                INNER JOIN CMS_User CU ON D.DocumentCreatedByUserID = CU.UserID
                                INNER JOIN CMS_User MU ON D.DocumentModifiedByUserID = MU.UserID
                                WHERE T.NodeSiteID = @SiteID AND D.DocumentCulture = @CultureCode
                                AND T.NodeID = @NodeID";

        QueryDataParameters qdp = new QueryDataParameters();
        qdp.Add(new DataParameter("SiteID", SiteContext.CurrentSiteID));
        qdp.Add(new DataParameter("CultureCode", LocalizationContext.PreferredCultureCode));
        qdp.Add(new DataParameter("NodeID", nodeid));

        QueryParameters qp = new QueryParameters(queryString, qdp, QueryTypeEnum.SQLQuery);

        DataSet ds = gc.ExecuteQuery(qp);
        DataTable dt = new DataTable();
        if (ds.Tables.Count != 0 || ds.Tables[0].Rows.Count != 0)
        {
            dt = ds.Tables[0];
            dt.Columns.Add("AbsolutePath");
            foreach (DataRow row in dt.Rows)
            {
                row["AbsolutePath"] = string.Concat(SiteContext.CurrentSite.SitePresentationURL, row["NodeAliasPath"]);
            }
        }

        var clientKey = GetClientKey();
        var contentResponse = new ContentResponse(clientKey, cs.CacheItemName, dt);

        if (cs.Cached)
        {
            var cacheKeyList = new List<string>();
            cacheKeyList.Add(String.Format("nodeid|{0}", nodeid));
            cacheKeyList.Add("dummy|kenticoextensions");
            cacheKeyList.Add("dummy|" + cs.CacheItemName);
            cs.CacheDependency = CacheHelper.GetCacheDependency(cacheKeyList);
        }

        return contentResponse;
    }

    private void ProcessGetCacheList()
    {
        var cacheItemName = string.Format("kenticoextensions|cachelist|{0}", Environment.MachineName.ToLower());
        ContentResponse cacheListContentResponse;

        if (refreshData == false && CacheHelper.TryGetItem(cacheItemName, out cacheListContentResponse))
        {
            WriteResponse(cacheListContentResponse);
            return;
        }

        CacheHelper.ClearCache(cacheItemName, false, false);

        var cacheStatuses = new List<CacheStatus>();
        IDictionaryEnumerator enumerator = HttpRuntime.Cache.GetEnumerator();
        while (enumerator.MoveNext())
        {
            string key = (string)enumerator.Key;
            if (key.StartsWith("kenticoextensions|") && key.StartsWith(cacheItemName) == false)
            {
                var cacheItemContainer = enumerator.Value as CacheItemContainer;
                if (cacheItemContainer.Data is ContentResponse)
                {
                    var cacheData = cacheItemContainer.Data as ContentResponse;
                    cacheStatuses.Add(new CacheStatus(cacheData));
                }
            }
        }

        var clientKey = GetClientKey();
        var contentResponse = new ContentResponse(clientKey, cacheItemName, cacheStatuses);

        var cacheKeyList = new List<string>();
        cacheKeyList.Add("dummy|kenticoextensions");
        cacheKeyList.Add("dummy|kenticoextensions|cachelist");
        cacheKeyList.Add("dummy|" + cacheItemName);
        var cacheDependencies = CacheHelper.GetCacheDependency(cacheKeyList);

        CacheHelper.Add(cacheItemName, contentResponse, cacheDependencies, DateTime.Now.AddMinutes(60), new TimeSpan(0, 0, 0));

        WriteResponse(contentResponse);
    }

    public static string GetClientKey()
    {
        var dataParam = QueryHelper.GetString("data", string.Empty);
        string clientKey = string.Format("{0}={1}&", "data", dataParam);

        foreach (string key in HttpContext.Current.Request.QueryString.AllKeys.OrderBy(k => k))
        {
            if (key != "data" && key != "showerror" && key != "compression" && key != "refreshdata")
                clientKey += string.Format("{0}={1}&", key, HttpContext.Current.Request.QueryString[key]);
        }

        clientKey = clientKey.Substring(0, clientKey.Length - 1);

        return clientKey;
    }

    public void ProcessGetConfiguration()
    {
        var cacheItemName = "kenticoextensions|configuration";
        if (refreshData)
            CacheHelper.TouchKey($"dummy|{cacheItemName}");

        contentResponse = CacheHelper.Cache(cs => GetConfiguration(cs), new CacheSettings(60, cacheItemName));
        UpdateCacheList(contentResponse);
        if (contentResponse == null)
        {
            WriteResponse(500, "Kentico Extensions configuration could not be found.");
            return;
        }
        WriteResponse(contentResponse);
    }

    private ContentResponse GetConfiguration(CacheSettings cs)
    {
        var config = new ExtensionsConfig();

        var configFilePath = HttpContext.Current.Server.MapPath("~") + kenticoextensionsconfig.CONFIG_PATH;
        if (File.Exists(configFilePath))
        {
            var configJSON = File.ReadAllText(configFilePath);
            config = JsonConvert.DeserializeObject<ExtensionsConfig>(configJSON);
        }
        else
        {
            var message = $"Kentico extensions config file could not be found at {configFilePath}";
            EventLogProvider.LogEvent(EventType.ERROR, nameof(kenticoextensionshandler), nameof(GetConfiguration), message);
        }

        foreach (var ext in config.Extensions ?? new List<ExtensionConfig>())
        {
            if (string.IsNullOrEmpty(ext.ConfigPath) == false)
            {
                var extensionConfigFullPath = HttpContext.Current.Server.MapPath("~") + ext.ConfigPath;
                if (File.Exists(extensionConfigFullPath))
                {
                    var extensionConfigJSON = File.ReadAllText(extensionConfigFullPath);
                    ext.Config = JsonConvert.DeserializeObject<object>(extensionConfigJSON);
                }

            }
        }

        var clientKey = GetClientKey();
        var contentResponse = new ContentResponse(clientKey, cs.CacheItemName, config);

        if (cs.Cached)
        {
            var cacheKeyList = new List<string>();
            cacheKeyList.Add("dummy|kenticoextensions");
            cacheKeyList.Add("dummy|" + cs.CacheItemName);
            cs.CacheDependency = CacheHelper.GetCacheDependency(cacheKeyList);
        }

        return contentResponse;
    }

    public void ProcessGetSettingsByCategoryName()
    {
        var categoryName = string.Empty;
        if (GetStringParam("categoryname", ref categoryName) == false)
        {
            WriteResponse(500, "Query string parameter categoryname is required.");
            return;
        }

        var recursive = false;
        if (GetBoolParam("recursive", ref recursive) == false)
        {
            WriteResponse(500, "Query string parameter recursive is required.");
            return;
        }

        var cacheItemName = string.Format("kenticoextensions|settingsbycategoryname|siteid={0}&categoryname={1}&recursive={2}",
                                            SiteContext.CurrentSiteID,
                                            categoryName,
                                            recursive.ToString().ToLower());
        if (refreshData)
            CacheHelper.TouchKey($"dummy|{cacheItemName}");

        contentResponse = CacheHelper.Cache(cs => GetSettingsByCategoryName(cs, categoryName, recursive), new CacheSettings(60, cacheItemName));

        UpdateCacheList(contentResponse);
        if (contentResponse == null)
        {
            WriteResponse(500, "Settings category with name " + categoryName + " could not be found.");
            return;
        }
        WriteResponse(contentResponse);
    }

    private ContentResponse GetSettingsByCategoryName(CacheSettings cs, string categoryName, bool recursive)
    {
        var settingsCategory = SettingsCategoryInfoProvider.GetSettingsCategoryInfoByName(categoryName);
        CustomSettingsCategory customSettingsCategory = null;

        if (settingsCategory != null)
        {
            customSettingsCategory = new CustomSettingsCategory(settingsCategory);
            var privilegeLevel = currentUser.SiteIndependentPrivilegeLevel;
            GetSettingsRecursive(ref customSettingsCategory, privilegeLevel, recursive);
        }

        var clientKey = GetClientKey();
        var contentResponse = new ContentResponse(clientKey, cs.CacheItemName, customSettingsCategory);

        if (cs.Cached)
        {
            var cacheKeyList = new List<string>();
            cacheKeyList.Add($"{SettingsKeyInfo.OBJECT_TYPE}|all");
            cacheKeyList.Add($"{SettingsCategoryInfo.OBJECT_TYPE}|all");
            cacheKeyList.Add("dummy|kenticoextensions");
            cacheKeyList.Add("dummy|" + cs.CacheItemName);
            cs.CacheDependency = CacheHelper.GetCacheDependency(cacheKeyList);
        }

        return contentResponse;
    }

    private void GetSettingsRecursive(ref CustomSettingsCategory settingsCategory, UserPrivilegeLevelEnum privilegeLevel, bool recursive)
    {
        //get child settings
        var childSettings = SettingsKeyInfoProvider.GetSettingsKeys(settingsCategory.CategoryID);
        foreach (var key in childSettings)
        {
            if (key.KeyEditingControlPath == "EncryptedPassword")
            {
                if (privilegeLevel == UserPrivilegeLevelEnum.GlobalAdmin)
                    key.KeyValue = EncryptionHelper.DecryptData(key.KeyValue);
                else
                    key.KeyValue = "**********";
            }

            var customSettingsKey = new CustomSettingsKey(key);
            settingsCategory.Keys.Add(customSettingsKey);
        }

        //get child categories and settings
        var childCategories = SettingsCategoryInfoProvider.GetSettingsCategories("CategoryParentID = " + settingsCategory.CategoryID);
        foreach (var category in childCategories)
        {
            var childSettingsCategory = new CustomSettingsCategory(category);
            settingsCategory.Categories.Add(childSettingsCategory);
            if (recursive)
            {
                GetSettingsRecursive(ref childSettingsCategory, privilegeLevel, recursive);
            }
        }
    }

    public void ProcessGetShortcutBarItems()
    {
        var cacheItemName = String.Format("kenticoextensions|shortcutbaritems|userid={0}", currentUser.UserID);
        if (refreshData)
            CacheHelper.TouchKey($"dummy|{cacheItemName}");

        contentResponse = CacheHelper.Cache(cs => GetShortcutItemsFromDB(cs), new CacheSettings(60, cacheItemName));
        UpdateCacheList(contentResponse);
        WriteResponse(contentResponse);
    }

    private ContentResponse GetShortcutItemsFromDB(CacheSettings cs)
    {
        List<ShortcutBarItem> shortcutBarDBItems = new List<ShortcutBarItem>();

        GeneralConnection gc = ConnectionHelper.GetConnection();
        string queryString = @"SELECT		ElementGUID, 
			                                SUBSTRING(ElementIDPath, 1, LEN(ElementIDPath)-9) AS ElementIDPath, 
			                                CASE WHEN CHARINDEX('{$', ElementDisplayName) = 1 THEN SUBSTRING(ElementDisplayName, 3, LEN(ElementDisplayName)-4) ELSE ElementDisplayName END AS ElementDisplayName, 
			                                ElementIconClass, 
			                                ElementIconPath
                                FROM		CMS_UIElement 
                                WHERE (SELECT UserDashboardApplications FROM CMS_UserSettings WHERE UserSettingsUserID = @UserID) LIKE '%' + CONVERT(varchar(50), ElementGUID) + '%'
                                ORDER BY	CHARINDEX(CONVERT(varchar(36), ElementGUID), (SELECT UserDashboardApplications FROM CMS_UserSettings WHERE UserSettingsUserID = @UserID))";


        QueryDataParameters qdp = new QueryDataParameters();
        qdp.Add(new DataParameter("UserID", currentUser.UserID));

        QueryParameters qp = new QueryParameters(queryString, qdp, QueryTypeEnum.SQLQuery);

        DataSet ds = gc.ExecuteQuery(qp);

        if (ds.Tables.Count != 0 || ds.Tables[0].Rows.Count != 0)
        {
            foreach (DataRow dr in ds.Tables[0].Rows)
            {
                ShortcutBarItem sbi = new ShortcutBarItem();
                sbi.name = CMS.Helpers.ResHelper.GetString(dr["ElementDisplayName"].ToString());
                sbi.guid = dr["ElementGUID"].ToString();
                sbi.iconClass = dr["ElementIconClass"].ToString();

                switch (dr["ElementIDPath"].ToString())
                {
                    case "/00002824/00001166/00001167":
                        sbi.iconColor = IconColor.Green;
                        break;
                    case "/00002824/00001166/00002298":
                        sbi.iconColor = IconColor.Red;
                        break;
                    case "/00002824/00001166/00002042":
                        sbi.iconColor = IconColor.Orange;
                        break;
                    case "/00002824/00001166/00001168":
                        sbi.iconColor = IconColor.Blue;
                        break;
                    case "/00002824/00001166/00001197":
                        sbi.iconColor = IconColor.Grey;
                        break;
                    case "/00002824/00001166/00002605":
                        sbi.iconColor = IconColor.Purple;
                        break;
                    default:
                        sbi.iconColor = IconColor.DarkBlue;
                        break;
                }
                shortcutBarDBItems.Add(sbi);
            }
        }

        var clientKey = GetClientKey();
        var contentResponse = new ContentResponse(clientKey, cs.CacheItemName, shortcutBarDBItems);

        if (cs.Cached)
        {
            var cacheKeyList = new List<string>();
            cacheKeyList.Add($"{UIElementInfo.OBJECT_TYPE}|all");
            cacheKeyList.Add($"{UserSettingsInfo.OBJECT_TYPE}|all");
            cacheKeyList.Add("dummy|kenticoextensions");
            cacheKeyList.Add("dummy|" + cs.CacheItemName);
            cs.CacheDependency = CacheHelper.GetCacheDependency(cacheKeyList);
        }

        return contentResponse;
    }

    private void ProcessStagingTasks()
    {
        var serverID = -1;
        if (GetIntParam("serverid", ref serverID) == false)
        {
            WriteResponse(500, "Query string parameter serverid is required.");
            return;
        }

        var cacheItemName = string.Format("kenticoextensions|stagingtasks|serverid={0}", serverID);
        if (refreshData)
            CacheHelper.TouchKey($"dummy|{cacheItemName}");

        contentResponse = CacheHelper.Cache(cs => GetStagingTasks(cs, serverID), new CacheSettings(60, cacheItemName));

        UpdateCacheList(contentResponse);
        WriteResponse(contentResponse);
    }

    private ContentResponse GetStagingTasks(CacheSettings cs, int serverID)
    {
        GeneralConnection gc = ConnectionHelper.GetConnection();
        string queryString = @"DECLARE @TaskUserTemp TABLE(TaskID int, TaskTitle nvarchar(450), TaskTime datetime2, UserID int, FullName nvarchar(450))
                                INSERT INTO @TaskUserTemp(TaskID, TaskTitle, TaskTime, UserID, FullName)
                                SELECT ST.TaskID, ST.TaskTitle, ST.TaskTime, STU.UserID, U.FullName
                                FROM Staging_Task ST
                                INNER JOIN Staging_Synchronization SS
                                ON ST.TaskID = SS.SynchronizationTaskID
                                INNER JOIN Staging_TaskUser STU ON
                                ST.TaskID = STU.TaskID
                                INNER JOIN CMS_User U ON
                                STU.UserID = U.UserID
                                WHERE SS.SynchronizationServerID = @SynchronizationServerID OR @SynchronizationServerID = -1
                                GROUP BY ST.TaskID, ST.TaskTitle, ST.TaskTime, STU.UserID, U.FullName

                                SELECT TaskID, TaskTitle, TaskTime, 
                                '|' + STRING_AGG(UserID, '|') + '|' AS UserIDList, 
                                STRING_AGG(FullName, ', ') WITHIN GROUP (ORDER BY FullName ASC) AS UserFullNameList
                                FROM @TaskUserTemp
                                GROUP BY TaskID, TaskTitle, TaskTime
                                ORDER BY TaskTime";

        QueryDataParameters qdp = new QueryDataParameters();
        qdp.Add(new DataParameter("SynchronizationServerID", serverID));
        QueryParameters qp = new QueryParameters(queryString, qdp, QueryTypeEnum.SQLQuery);
        DataSet ds = gc.ExecuteQuery(qp);

        var dt = new DataTable();
        if (ds.Tables.Count != 0 || ds.Tables[0].Rows.Count != 0)
            dt = ds.Tables[0];

        var clientKey = GetClientKey();
        var contentResponse = new ContentResponse(clientKey, cs.CacheItemName, dt);

        if (cs.Cached)
        {
            var cacheKeyList = new List<string>();
            cacheKeyList.Add($"{StagingTaskInfo.OBJECT_TYPE}|all");
            cacheKeyList.Add($"{StagingTaskUserInfo.OBJECT_TYPE}|all");
            cacheKeyList.Add($"{UserInfo.OBJECT_TYPE}|all");
            cacheKeyList.Add("dummy|kenticoextensions");
            cacheKeyList.Add("dummy|kenticoextensions|stagingtasks");
            cacheKeyList.Add("dummy|" + cs.CacheItemName);
            cs.CacheDependency = CacheHelper.GetCacheDependency(cacheKeyList);
        }

        return contentResponse;
    }

    private void ProcessStagingUsers()
    {
        var serverID = 0;
        if (GetIntParam("serverid", ref serverID) == false)
        {
            WriteResponse(500, "Query string parameter serverid is required.");
            return;
        }

        var cacheItemName = string.Format("kenticoextensions|stagingusers|serverid={0}", serverID);
        if (refreshData)
            CacheHelper.TouchKey($"dummy|{cacheItemName}");

        contentResponse = CacheHelper.Cache(cs => GetStagingUsers(cs, serverID), new CacheSettings(60, cacheItemName));

        UpdateCacheList(contentResponse);
        WriteResponse(contentResponse);
    }

    private ContentResponse GetStagingUsers(CacheSettings cs, int serverID)
    {
        GeneralConnection gc = ConnectionHelper.GetConnection();
        string queryString = @"SELECT U.UserID, U.FullName AS [UserFullName]
                                FROM Staging_Task ST
                                INNER JOIN Staging_Synchronization SS
                                ON ST.TaskID = SS.SynchronizationTaskID
                                INNER JOIN Staging_TaskUser STU ON
                                ST.TaskID = STU.TaskID
                                INNER JOIN CMS_User U ON
                                STU.UserID = U.UserID
                                WHERE SS.SynchronizationServerID = @SynchronizationServerID OR @SynchronizationServerID = -1
                                GROUP BY U.UserID, U.FullName
                                ORDER By U.FullName";

        QueryDataParameters qdp = new QueryDataParameters();
        qdp.Add(new DataParameter("SynchronizationServerID", serverID));
        QueryParameters qp = new QueryParameters(queryString, qdp, QueryTypeEnum.SQLQuery);
        DataSet ds = gc.ExecuteQuery(qp);

        var dt = new DataTable();
        if (ds.Tables.Count != 0 || ds.Tables[0].Rows.Count != 0)
            dt = ds.Tables[0];

        var clientKey = GetClientKey();
        var contentResponse = new ContentResponse(clientKey, cs.CacheItemName, dt);

        if (cs.Cached)
        {
            var cacheKeyList = new List<string>();
            cacheKeyList.Add($"{StagingTaskInfo.OBJECT_TYPE}|all");
            cacheKeyList.Add($"{StagingTaskUserInfo.OBJECT_TYPE}|all");
            cacheKeyList.Add($"{UserInfo.OBJECT_TYPE}|all");
            cacheKeyList.Add("dummy|kenticoextensions");
            cacheKeyList.Add("dummy|kenticoextensions|stagingusers");
            cacheKeyList.Add("dummy|" + cs.CacheItemName);
            cs.CacheDependency = CacheHelper.GetCacheDependency(cacheKeyList);
        }

        return contentResponse;
    }


    private void ProcessMediaFileInfo()
    {
        Guid fileGUID = Guid.Empty;
        if (GetGUIDParam("fileguid", ref fileGUID) == false)
        {
            WriteResponse(500, "Query string parameter fileguid is required and must be a valid guid value.");
            return;
        }
        int width = 0;
        if (GetIntParam("width", ref width) == false)
        {
            WriteResponse(500, "Query string parameter width is required and must be a valid integer value.");
            return;
        }

        int height = 0;
        if (GetIntParam("height", ref height) == false)
        {
            WriteResponse(500, "Query string parameter height is required and must be a valid integer value.");
            return;
        }

        var cacheItemName = string.Format("kenticoextensions|mediafileinfo|fileguid={0}&width={1}&height={2}", fileGUID.ToString(), width, height);
        if (refreshData)
            CacheHelper.TouchKey($"dummy|{cacheItemName}");

        contentResponse = CacheHelper.Cache(cs => GetMediaFileInfo(cs, fileGUID, width, height), new CacheSettings(60, cacheItemName));

        UpdateCacheList(contentResponse);
        WriteResponse(contentResponse);
    }

    private ContentResponse GetMediaFileInfo(CacheSettings cs, Guid fileGUID, int width, int height)
    {
        var clientKey = GetClientKey();

        var mediaFileInfo = MediaFileInfoProvider.GetMediaFileInfo(fileGUID, SiteContext.CurrentSiteName);
        if (mediaFileInfo == null)
            return new ContentResponse(clientKey, cs.CacheItemName, null);

        var mediaFile = new MediaFile(mediaFileInfo);
        var libarayPath = MediaLibraryInfoProvider.GetMediaLibraryFolderPath(mediaFile.LibrayID);
        mediaFile.FullPath = String.Format("{0}\\{1}", libarayPath, mediaFile.FullPath);

        if (width != mediaFile.Width || height != mediaFile.Height)
        {
            var mediaFileHiddenFolder = SettingsKeyInfoProvider.GetValue(SiteContext.CurrentSiteName + ".CMSMediaFileHiddenFolder");
            var fileExt = mediaFile.Extension.Replace(".", "");
            var filename = String.Format("{0}_{1}_{2}_{3}.{4}", mediaFile.Name, fileExt, width, height, fileExt);
            var filePath = String.Format("{0}\\{1}\\{2}", libarayPath, mediaFileHiddenFolder, filename);

            mediaFile.FullPath = filePath;
            System.IO.FileInfo fi = new System.IO.FileInfo(filePath);
            mediaFile.Size = fi.Length;
            mediaFile.Width = width;
            mediaFile.Height = height;
        }

        var contentResponse = new ContentResponse(clientKey, cs.CacheItemName, mediaFile);

        if (cs.Cached)
        {
            var cacheKeyList = new List<string>();
            cacheKeyList.Add($"mediafile|{fileGUID}");
            cacheKeyList.Add("dummy|kenticoextensions");
            cacheKeyList.Add("dummy|" + cs.CacheItemName);
            cs.CacheDependency = CacheHelper.GetCacheDependency(cacheKeyList);
        }

        return contentResponse;
    }

    private void ProcessGetSites()
    {
        var cacheItemName = string.Format("kenticoextensions|sites");
        if (refreshData)
            CacheHelper.TouchKey($"dummy|{cacheItemName}");

        contentResponse = CacheHelper.Cache(cs => GetSites(cs), new CacheSettings(60, cacheItemName));

        UpdateCacheList(contentResponse);
        WriteResponse(contentResponse);
    }

    private ContentResponse GetSites(CacheSettings cs)
    {
        GeneralConnection gc = ConnectionHelper.GetConnection();
        string queryString = @"SELECT SiteID AS [ID], SiteDisplayName [DisplayName], SiteName [CodeName], 
                                SiteStatus AS [Status], SiteDomainName AS [AdminDomain], SitePresentationURL AS [URL]
                                FROM CMS_Site 
                                ORDER BY SiteID";

        QueryParameters qp = new QueryParameters(queryString, null, QueryTypeEnum.SQLQuery);
        DataSet ds = gc.ExecuteQuery(qp);

        var dt = new DataTable();
        if (ds.Tables.Count != 0 || ds.Tables[0].Rows.Count != 0)
            dt = ds.Tables[0];

        var clientKey = GetClientKey();
        var contentResponse = new ContentResponse(clientKey, cs.CacheItemName, dt);

        if (cs.Cached)
        {
            var cacheKeyList = new List<string>();
            cacheKeyList.Add($"{SiteInfo.OBJECT_TYPE}|all");
            cacheKeyList.Add("dummy|kenticoextensions");
            cacheKeyList.Add("dummy|kenticoextensions|sites");
            cacheKeyList.Add("dummy|" + cs.CacheItemName);
            cs.CacheDependency = CacheHelper.GetCacheDependency(cacheKeyList);
        }

        return contentResponse;
    }

    private void ProcessGetPageTypes()
    {
        var cacheItemName = string.Format("kenticoextensions|pagetypes");
        if (refreshData)
            CacheHelper.TouchKey($"dummy|{cacheItemName}");

        contentResponse = CacheHelper.Cache(cs => GetPageTypes(cs), new CacheSettings(60, cacheItemName));

        UpdateCacheList(contentResponse);
        WriteResponse(contentResponse);
    }

    private ContentResponse GetPageTypes(CacheSettings cs)
    {
        GeneralConnection gc = ConnectionHelper.GetConnection();
        string queryString = @"SELECT C.ClassID, C.ClassGUID, C.ClassDisplayName, C.ClassName, C.ClassTableName,
                                IC.ClassID AS InheritedClassID, 
                                IC.ClassGUID AS InheritedClassGUID, 
                                IC.ClassDisplayName AS InheritedClassDisplayName, 
                                IC.ClassName AS InheritedClassName, 
                                IC.ClassTableName AS InheritedClassTableName,
                                SUBSTRING((
                                SELECT ',' + CONVERT(varchar(10), SiteID) FROM CMS_ClassSite WHERE ClassID = C.ClassID ORDER BY SiteID FOR XML PATH('')
                                ), 2, 20) AS SiteIDs
                                FROM CMS_Class C
                                LEFT OUTER JOIN CMS_Class IC ON C.ClassInheritsFromClassID = IC.ClassID
                                WHERE C.ClassIsDocumentType = 1
                                ORDER BY C.ClassDisplayName";

        QueryParameters qp = new QueryParameters(queryString, null, QueryTypeEnum.SQLQuery);
        DataSet ds = gc.ExecuteQuery(qp);

        var pageTypes = new List<PageType>();
        if (ds.Tables.Count != 0 || ds.Tables[0].Rows.Count != 0)
        {
            foreach (DataRow dr in ds.Tables[0].Rows)
            {
                pageTypes.Add(new PageType(dr));
            }
        }

        var clientKey = GetClientKey();
        var contentResponse = new ContentResponse(clientKey, cs.CacheItemName, pageTypes);

        if (cs.Cached)
        {
            var cacheKeyList = new List<string>();
            cacheKeyList.Add($"{DataClassInfo.OBJECT_TYPE}|all");
            cacheKeyList.Add($"{ClassSiteInfo.OBJECT_TYPE}|all");
            cacheKeyList.Add("dummy|kenticoextensions");
            cacheKeyList.Add("dummy|kenticoextensions|pagetypes");
            cacheKeyList.Add("dummy|" + cs.CacheItemName);
            cs.CacheDependency = CacheHelper.GetCacheDependency(cacheKeyList);
        }

        return contentResponse;
    }

    private void ProcessGetCustomTables()
    {
        var cacheItemName = $"kenticoextensions|customtables";
        if (refreshData)
            CacheHelper.TouchKey($"dummy|{cacheItemName}");

        contentResponse = CacheHelper.Cache(cs => GetCustomTables(cs), new CacheSettings(60, cacheItemName));

        UpdateCacheList(contentResponse);
        WriteResponse(contentResponse);
    }

    private ContentResponse GetCustomTables(CacheSettings cs)
    {
        GeneralConnection gc = ConnectionHelper.GetConnection();
        string queryString = @"SELECT C.ClassID, C.ClassGUID, C.ClassDisplayName AS [DisplayName], C.ClassName AS [CodeName], C.ClassTableName AS [TableName],
                                SUBSTRING((
                                SELECT ',' + CONVERT(varchar(10), SiteID) FROM CMS_ClassSite WHERE ClassID = C.ClassID ORDER BY SiteID FOR XML PATH('')
                                ), 2, 20) AS SiteIDs
                                FROM CMS_Class C
                                LEFT OUTER JOIN CMS_Class IC ON C.ClassInheritsFromClassID = IC.ClassID
                                WHERE C.ClassIsCustomTable = 1
                                ORDER BY C.ClassDisplayName";

        QueryParameters qp = new QueryParameters(queryString, null, QueryTypeEnum.SQLQuery);
        DataSet ds = gc.ExecuteQuery(qp);

        var dt = new DataTable();
        if (ds.Tables.Count != 0 || ds.Tables[0].Rows.Count != 0)
            dt = ds.Tables[0];

        var clientKey = GetClientKey();
        var contentResponse = new ContentResponse(clientKey, cs.CacheItemName, dt);

        if (cs.Cached)
        {
            var cacheKeyList = new List<string>();
            cacheKeyList.Add($"{DataClassInfo.OBJECT_TYPE}|all");
            cacheKeyList.Add($"{ClassSiteInfo.OBJECT_TYPE}|all");
            cacheKeyList.Add("dummy|kenticoextensions");
            cacheKeyList.Add("dummy|kenticoextensions|customtables");
            cacheKeyList.Add("dummy|" + cs.CacheItemName);
            cs.CacheDependency = CacheHelper.GetCacheDependency(cacheKeyList);
        }

        return contentResponse;
    }

    private void ProcessGetModuleClasses()
    {
        var cacheItemName = $"kenticoextensions|moduleclasses";
        if (refreshData)
            CacheHelper.TouchKey($"dummy|{cacheItemName}");

        contentResponse = CacheHelper.Cache(cs => GetModuleClasses(cs), new CacheSettings(60, cacheItemName));

        UpdateCacheList(contentResponse);
        WriteResponse(contentResponse);
    }

    private ContentResponse GetModuleClasses(CacheSettings cs)
    {
        GeneralConnection gc = ConnectionHelper.GetConnection();
        string queryString = @"SELECT R.ResourceID AS [ID], R.ResourceGUID AS [GUID], 
                                R.ResourceDisplayName AS [DisplayName], R.ResourceName AS [Name], 
                                C.ClassID, C.ClassGUID, C.ClassDisplayName, C.ClassName, C.ClassTableName,
                                SUBSTRING((
                                SELECT ',' + CONVERT(varchar(10), SiteID) FROM CMS_ResourceSite WHERE ResourceID = R.ResourceID ORDER BY SiteID FOR XML PATH('')
                                ), 2, 20) AS SiteIDs
                                FROM CMS_Resource R
                                INNER JOIN CMS_Class C ON R.ResourceID = C.ClassResourceID
                                ORDER BY R.ResourceName, C.ClassDisplayName";

        QueryParameters qp = new QueryParameters(queryString, null, QueryTypeEnum.SQLQuery);
        DataSet ds = gc.ExecuteQuery(qp);

        var dt = new DataTable();
        if (ds.Tables.Count != 0 || ds.Tables[0].Rows.Count != 0)
            dt = ds.Tables[0];

        var clientKey = GetClientKey();
        var contentResponse = new ContentResponse(clientKey, cs.CacheItemName, dt);

        if (cs.Cached)
        {
            var cacheKeyList = new List<string>();
            cacheKeyList.Add($"{DataClassInfo.OBJECT_TYPE}|all");
            cacheKeyList.Add($"{ClassSiteInfo.OBJECT_TYPE}|all");
            cacheKeyList.Add("dummy|kenticoextensions");
            cacheKeyList.Add("dummy|kenticoextensions|moduleclasses");
            cacheKeyList.Add("dummy|" + cs.CacheItemName);
            cs.CacheDependency = CacheHelper.GetCacheDependency(cacheKeyList);
        }

        return contentResponse;
    }

    private void ProcessGetDatabaseTables()
    {
        var cacheItemName = "kenticoextensions|databasetables";
        if (refreshData)
            CacheHelper.TouchKey($"dummy|{cacheItemName}");

        contentResponse = CacheHelper.Cache(cs => GetDatabaseTables(cs), new CacheSettings(60, cacheItemName));

        UpdateCacheList(contentResponse);
        WriteResponse(contentResponse);
    }

    private ContentResponse GetDatabaseTables(CacheSettings cs)
    {
        GeneralConnection gc = ConnectionHelper.GetConnection();
        string queryString = @"SELECT S.TABLE_NAME AS TableName, C.ClassName
                                FROM INFORMATION_SCHEMA.TABLES S
                                LEFT OUTER JOIN CMS_Class C ON S.TABLE_NAME COLLATE DATABASE_DEFAULT = C.ClassTableName COLLATE DATABASE_DEFAULT
                                WHERE S.TABLE_TYPE = 'BASE TABLE'
                                ORDER BY S.TABLE_NAME";

        QueryParameters qp = new QueryParameters(queryString, null, QueryTypeEnum.SQLQuery);
        DataSet ds = gc.ExecuteQuery(qp);

        var dt = new DataTable();
        if (ds.Tables.Count != 0 || ds.Tables[0].Rows.Count != 0)
            dt = ds.Tables[0];

        var clientKey = GetClientKey();
        var contentResponse = new ContentResponse(clientKey, cs.CacheItemName, dt);

        if (cs.Cached)
        {
            var cacheKeyList = new List<string>();
            cacheKeyList.Add($"{DataClassInfo.OBJECT_TYPE}|all");
            cacheKeyList.Add("dummy|kenticoextensions");
            cacheKeyList.Add("dummy|" + cs.CacheItemName);
            cs.CacheDependency = CacheHelper.GetCacheDependency(cacheKeyList);
        }

        return contentResponse;
    }

    private void ProcessGetDatabaseTableSchema()
    {
        var cacheItemName = "kenticoextensions|databasetableschema";
        if (refreshData)
            CacheHelper.TouchKey($"dummy|{cacheItemName}");

        contentResponse = CacheHelper.Cache(cs => GetDatabaseTableSchema(cs), new CacheSettings(60, cacheItemName));

        UpdateCacheList(contentResponse);
        WriteResponse(contentResponse);
    }

    private ContentResponse GetDatabaseTableSchema(CacheSettings cs)
    {
        GeneralConnection gc = ConnectionHelper.GetConnection();
        string queryString = @"SELECT C.TABLE_NAME AS [Table], C.COLUMN_NAME AS [Column], C.IS_NULLABLE AS [Nullable], 
                                CASE
                                WHEN ISNULL(C.CHARACTER_MAXIMUM_LENGTH, 0) <> 0
                                THEN DATA_TYPE + '(' + IIF(CONVERT(varchar(10), C.CHARACTER_MAXIMUM_LENGTH) = '-1', 'MAX', CONVERT(varchar(10), C.CHARACTER_MAXIMUM_LENGTH)) + ')'
                                WHEN DATA_TYPE <> 'int' AND ISNULL(C.NUMERIC_PRECISION, 0) <> 0
                                THEN DATA_TYPE + '(' + CONVERT(varchar(10), C.NUMERIC_PRECISION) + ', ' + CONVERT(varchar(10), C.NUMERIC_PRECISION_RADIX - 1) + ')'
                                ELSE DATA_TYPE
                                END AS [DataType]
                                FROM INFORMATION_SCHEMA.COLUMNS C
                                INNER JOIN INFORMATION_SCHEMA.TABLES T ON
                                C.TABLE_NAME = T.TABLE_NAME
                                WHERE T.TABLE_TYPE = 'BASE TABLE'
                                ORDER BY C.TABLE_NAME, C.ORDINAL_POSITION";

        QueryParameters qp = new QueryParameters(queryString, null, QueryTypeEnum.SQLQuery);
        DataSet ds = gc.ExecuteQuery(qp);

        var dt = new DataTable();
        if (ds.Tables.Count != 0 || ds.Tables[0].Rows.Count != 0)
            dt = ds.Tables[0];

        var clientKey = GetClientKey();
        var contentResponse = new ContentResponse(clientKey, cs.CacheItemName, dt);

        if (cs.Cached)
        {
            var cacheKeyList = new List<string>();
            cacheKeyList.Add($"{DataClassInfo.OBJECT_TYPE}|all");
            cacheKeyList.Add("dummy|kenticoextensions");
            cacheKeyList.Add("dummy|" + cs.CacheItemName);
            cs.CacheDependency = CacheHelper.GetCacheDependency(cacheKeyList);
        }

        return contentResponse;
    }

    private void ProcessGetClassSchema()
    {
        var cacheItemName = $"kenticoextensions|classschema|classname~{customObjectPrefix}%";
        if (refreshData)
            CacheHelper.TouchKey($"dummy|{cacheItemName}");

        contentResponse = CacheHelper.Cache(cs => GetClassSchema(cs), new CacheSettings(60, cacheItemName));

        UpdateCacheList(contentResponse);
        WriteResponse(contentResponse);
    }

    private ContentResponse GetClassSchema(CacheSettings cs)
    {
        GeneralConnection gc = ConnectionHelper.GetConnection();
        string queryString = $@"DECLARE @ClassFormDefinitions TABLE (ClassFormDefinition varchar(max))

                                INSERT INTO @ClassFormDefinitions(ClassFormDefinition)
                                SELECT '<class codename=""' + ClassName + '"">' + ClassFormDefinition + '</class>' 
                                FROM CMS_Class
                                WHERE ClassName LIKE '{customObjectPrefix}%' OR ClassName LIKE 'BizForm.%'
                                ORDER BY LEN(ClassFormDefinition) DESC

                                DECLARE @ClassesXML VARCHAR(max)
                                SELECT @ClassesXML = COALESCE(@ClassesXML + '', '') + ClassFormDefinition
                                FROM @ClassFormDefinitions

                                SET @ClassesXML = '<root>' + @ClassesXML + '</root>'

                                DECLARE @XMLData xml = @ClassesXML
                                DECLARE @hDoc AS INT

                                EXEC sp_xml_preparedocument @hDoc OUTPUT, @XMLData

                                SELECT ClassName, ISNULL(IsInherited, 'false') AS IsInherited, FieldName, DataType, ISNULL(Visible, 'false') AS Visible,
                                FieldCaption, FieldDescription, ExplanationText,
                                FUC.UserControlDisplayName AS FormControl
                                FROM OPENXML(@hDoc, 'root/class/form/field')
                                WITH
                                (
                                    ClassName[varchar](50) '../../@codename',
                                    IsInherited[varchar](5) '@isinherited',
                                    FieldName[varchar](50) '@column',
                                    DataType[varchar](50) '@columntype',
                                    Visible[varchar](5) '@visible',
                                    FieldCaption[varchar](50) 'properties/fieldcaption',
                                    FieldDescription[varchar](200) 'properties/fielddescription',
                                    ExplanationText[varchar](200) 'properties/explanationtext',
                                    ControlName[varchar](50) 'settings/controlname'
                                ) AS Doc
                                INNER JOIN CMS_FormUserControl FUC ON
                                Doc.ControlName = FUC.UserControlCodeName";

        QueryParameters qp = new QueryParameters(queryString, null, QueryTypeEnum.SQLQuery);
        DataSet ds = gc.ExecuteQuery(qp);

        var dt = new DataTable();
        if (ds.Tables.Count != 0 || ds.Tables[0].Rows.Count != 0)
            dt = ds.Tables[0];

        var clientKey = GetClientKey();
        var contentResponse = new ContentResponse(clientKey, cs.CacheItemName, dt);

        if (cs.Cached)
        {
            var cacheKeyList = new List<string>();
            cacheKeyList.Add($"{DataClassInfo.OBJECT_TYPE}|all");
            cacheKeyList.Add("dummy|kenticoextensions");
            cacheKeyList.Add("dummy|" + cs.CacheItemName);
            cs.CacheDependency = CacheHelper.GetCacheDependency(cacheKeyList);
        }

        return contentResponse;
    }

    private void ProcessGetSettingKeys()
    {
        var cacheItemName = "kenticoextensions|settingkeys";
        if (refreshData)
            CacheHelper.TouchKey($"dummy|{cacheItemName}");

        contentResponse = CacheHelper.Cache(cs => GetSettingKeys(cs), new CacheSettings(60, cacheItemName));

        UpdateCacheList(contentResponse);
        WriteResponse(contentResponse);
    }

    private ContentResponse GetSettingKeys(CacheSettings cs)
    {
        GeneralConnection gc = ConnectionHelper.GetConnection();
        string queryString = @"SELECT SK.KeyName AS [Name], SK.KeyDisplayName AS [DisplayName], 
                                SK.KeyType AS [Type], ISNULL(S.SiteDisplayName, 'Global') AS [Scope],
                                SK.KeyValue AS [Value], SC.CategoryParentID
                                FROM CMS_SettingsKey SK
                                LEFT OUTER JOIN CMS_SettingsCategory SC ON SK.KeyCategoryID = SC.CategoryID
                                LEFT OUTER JOIN CMS_Site S ON SK.SiteID = S.SiteID
                                ORDER BY SK.KeyName, IIF(ISNULL(S.SiteDisplayName, 'A') = 'A', 'A', 'B')";

        QueryParameters qp = new QueryParameters(queryString, null, QueryTypeEnum.SQLQuery);
        DataSet ds = gc.ExecuteQuery(qp);

        var dt = new DataTable();
        if (ds.Tables.Count != 0 || ds.Tables[0].Rows.Count != 0)
            dt = ds.Tables[0];

        var clientKey = GetClientKey();
        var contentResponse = new ContentResponse(clientKey, cs.CacheItemName, dt);

        if (cs.Cached)
        {
            var cacheKeyList = new List<string>();
            cacheKeyList.Add($"{SettingsKeyInfo.OBJECT_TYPE}|all");
            cacheKeyList.Add($"{SettingsCategoryInfo.OBJECT_TYPE}|all");
            cacheKeyList.Add($"{SiteInfo.OBJECT_TYPE}|all");
            cacheKeyList.Add("dummy|kenticoextensions");
            cacheKeyList.Add("dummy|" + cs.CacheItemName);
            cs.CacheDependency = CacheHelper.GetCacheDependency(cacheKeyList);
        }

        return contentResponse;
    }


    private void ProcessGetForms()
    {
        var cacheItemName = "kenticoextensions|forms";
        if (refreshData)
            CacheHelper.TouchKey($"dummy|{cacheItemName}");

        contentResponse = CacheHelper.Cache(cs => GetForms(cs), new CacheSettings(60, cacheItemName));

        UpdateCacheList(contentResponse);
        WriteResponse(contentResponse);
    }

    private ContentResponse GetForms(CacheSettings cs)
    {
        GeneralConnection gc = ConnectionHelper.GetConnection();
        string queryString = @"SELECT F.FormID AS [ID], F.FormDisplayName AS [DisplayName], F.FormName AS [CodeName], 
                                C.ClassID, C.ClassName, C.ClassTableName AS [TableName], S.SiteDisplayName AS [Site], F.FormItems AS [Records]
                                FROM CMS_Form F
                                INNER JOIN CMS_Class C ON F.FormClassID = C.ClassID
                                INNER JOIN CMS_Site S ON F.FormSiteID = S.SiteID
                                ORDER BY FormDisplayName";

        QueryParameters qp = new QueryParameters(queryString, null, QueryTypeEnum.SQLQuery);
        DataSet ds = gc.ExecuteQuery(qp);

        var dt = new DataTable();
        if (ds.Tables.Count != 0 || ds.Tables[0].Rows.Count != 0)
            dt = ds.Tables[0];

        var clientKey = GetClientKey();
        var contentResponse = new ContentResponse(clientKey, cs.CacheItemName, dt);

        if (cs.Cached)
        {
            var cacheKeyList = new List<string>();
            cacheKeyList.Add($"{BizFormInfo.OBJECT_TYPE}|all");
            cacheKeyList.Add($"{DataClassInfo.OBJECT_TYPE}|all");
            cacheKeyList.Add($"{SiteInfo.OBJECT_TYPE}|all");
            cacheKeyList.Add("dummy|kenticoextensions");
            cacheKeyList.Add("dummy|" + cs.CacheItemName);
            cs.CacheDependency = CacheHelper.GetCacheDependency(cacheKeyList);
        }

        return contentResponse;
    }

    private void ProcessExecuteQuery()
    {
        if (!IsGlobalAdmin)
        {
            WriteResponse(403, "User must be have Global Admin privilege level to execute queries.");
            return;
        }

        GeneralConnection gc = ConnectionHelper.GetConnection();

        var sqlQuery = new StreamReader(context.Request.InputStream).ReadToEnd();

        try
        {
            QueryParameters qp = new QueryParameters(sqlQuery, null, QueryTypeEnum.SQLQuery);

            if (sqlQuery.ToLower().StartsWith("select"))
            {
                DataSet ds = gc.ExecuteQuery(qp);
                if (ds.Tables.Count != 0 && ds.Tables[0].Rows.Count != 0)
                {
                    WriteResponse(ds.Tables[0]);
                    return;
                }

                WriteResponse("No results");
                return;
            }

            int rowsAffected = gc.ExecuteNonQuery(qp);
            if (rowsAffected != -1)
            {
                WriteResponse($"{rowsAffected} rows affected.");
                return;
            }

            WriteResponse("Command completed successfully.");
            return;
        }
        catch (Exception ex)
        {
            WriteResponse("Exception: " + ex.Message);
            return;
        }
    }

    private void ProcessGetMediaFiles()
    {
        var cacheItemName = $"kenticoextensions|mediafiles|siteid={SiteContext.CurrentSiteID}";
        if (refreshData)
            CacheHelper.TouchKey($"dummy|{cacheItemName}");

        contentResponse = CacheHelper.Cache(cs => GetMediaFiles(cs), new CacheSettings(60, cacheItemName));

        UpdateCacheList(contentResponse);
        WriteResponse(contentResponse);
    }

    private ContentResponse GetMediaFiles(CacheSettings cs)
    {
        GeneralConnection gc = ConnectionHelper.GetConnection();
        string queryString = @"SELECT		CASE 
			                                WHEN MF.FileExtension = '.bmp' OR MF.FileExtension = '.gif' OR MF.FileExtension = '.jpg' OR MF.FileExtension = '.jpeg' OR MF.FileExtension = '.png' THEN 
			                                '<a href=""/getmedia/' + CONVERT(varchar(50), MF.FileGUID) + '/' + MF.[FileName] + '"" target=""_blank""><img src=""/getmedia/' + CONVERT(varchar(50), MF.FileGUID) + '/' + MF.[FileName] + '"" style=""max-width: 100px; max-height: 100px"" /></a>'
			                                ELSE 'NA' END AS [Preview],
			                                ML.LibraryName,
			                                MF.FilePath, 
			                                MF.FileName, 
			                                MF.FileExtension,
			                                CONVERT(varchar(10), MF.FileImageWidth) + ' x ' + CONVERT(varchar(10), MF.FileImageHeight) AS Dimensions,
			                                MF.FileCreatedWhen,
			                                MF.FileModifiedWhen
                                FROM		Media_Library ML
                                INNER JOIN	Media_File MF ON
			                                ML.LibraryID = MF.FileLibraryID
                                WHERE		ML.LibrarySiteID = @SiteID
                                ORDER BY	ML.LibraryName, MF.FilePath";

        QueryDataParameters qdp = new QueryDataParameters();
        qdp.Add(new DataParameter("SiteID", SiteContext.CurrentSiteID));

        QueryParameters qp = new QueryParameters(queryString, qdp, QueryTypeEnum.SQLQuery);
        DataSet ds = gc.ExecuteQuery(qp);

        var dt = new DataTable();
        if (ds.Tables.Count != 0 || ds.Tables[0].Rows.Count != 0)
            dt = ds.Tables[0];

        var clientKey = GetClientKey();
        var contentResponse = new ContentResponse(clientKey, cs.CacheItemName, dt);

        if (cs.Cached)
        {
            var cacheKeyList = new List<string>();
            cacheKeyList.Add($"{MediaFileInfo.OBJECT_TYPE}|all");
            cacheKeyList.Add($"{MediaLibraryInfo.OBJECT_TYPE}|all");
            cacheKeyList.Add("dummy|kenticoextensions");
            cacheKeyList.Add("dummy|" + cs.CacheItemName);
            cs.CacheDependency = CacheHelper.GetCacheDependency(cacheKeyList);
        }

        return contentResponse;
    }

    private void ProcessGetReports()
    {
        var cacheItemName = $"kenticoextensions|reports|reportname~{customReportsPrefix}%";
        if (refreshData)
            CacheHelper.TouchKey($"dummy|{cacheItemName}");

        contentResponse = CacheHelper.Cache(cs => GetReports(cs), new CacheSettings(60, cacheItemName));

        UpdateCacheList(contentResponse);
        WriteResponse(contentResponse);
    }

    private ContentResponse GetReports(CacheSettings cs)
    {
        GeneralConnection gc = ConnectionHelper.GetConnection();
        string queryString = $@"SELECT ReportCategoryID, 
                                REPLACE(REPLACE(REPLACE(ReportName, '_' + REPLACE(ReportDisplayName, ' ',''), ''), 'Reporting_', ''), '_', ' > ') AS [Category],
                                ReportID,                                
                                ReportName,
                                ReportDisplayName AS DisplayName
                                FROM Reporting_Report
                                WHERE ReportName LIKE '{customReportsPrefix}%'
                                ORDER BY ReportName";

        QueryParameters qp = new QueryParameters(queryString, null, QueryTypeEnum.SQLQuery);
        DataSet ds = gc.ExecuteQuery(qp);

        var dt = new DataTable();
        if (ds.Tables.Count != 0 || ds.Tables[0].Rows.Count != 0)
            dt = ds.Tables[0];

        var clientKey = GetClientKey();
        var contentResponse = new ContentResponse(clientKey, cs.CacheItemName, dt);

        if (cs.Cached)
        {
            var cacheKeyList = new List<string>();
            cacheKeyList.Add($"{ReportInfo.OBJECT_TYPE}|all");
            cacheKeyList.Add("dummy|kenticoextensions");
            cacheKeyList.Add("dummy|" + cs.CacheItemName);
            cs.CacheDependency = CacheHelper.GetCacheDependency(cacheKeyList);
        }

        return contentResponse;
    }

    private void ProcessGetTreeData()
    {
        var cacheItemName = $"kenticoextensions|treedata|siteid={SiteContext.CurrentSiteID}";
        if (refreshData)
            CacheHelper.TouchKey($"dummy|{cacheItemName}");

        contentResponse = CacheHelper.Cache(cs => GetTreeData(cs), new CacheSettings(60, cacheItemName));

        UpdateCacheList(contentResponse);
        WriteResponse(contentResponse);
    }

    private ContentResponse GetTreeData(CacheSettings cs)
    {
        GeneralConnection gc = ConnectionHelper.GetConnection();
        string queryString = @"WITH TreeCTE(SiteID, NodeID, NodeParentID, NodeOrder, DocumentGUID, DocumentName, ClassName, NodeAliasPath, DocumentNamePath, NodeIDPath, NodeOrderPath, DocumentGUIDPath) AS
                            (
	                            SELECT		T.NodeSiteID, T.NodeID, T.NodeParentID, ISNULL(T.NodeOrder, 1) AS NodeOrder, T.DocumentGUID, T.DocumentName, T.ClassName, T.NodeAliasPath,
				                            IIF(T.DocumentName = '', '', '/') + CAST(T.DocumentName AS VARCHAR(max)) AS DocumentNamePath,
				                            '/' + CAST(RIGHT('00000' + CAST(T.NodeID AS VARCHAR), 5) AS VARCHAR(max)) AS NodeIDPath,
				                            '/' + CAST(RIGHT('00000' + CAST(ISNULL(T.NodeOrder, 1) AS VARCHAR), 5) AS VARCHAR(max)) AS NodeOrderPath,
				                            '/' + CAST(T.DocumentGUID AS VARCHAR(max)) AS DocumentGUIDPath
	                            FROM		View_CMS_Tree_Joined T
	                            WHERE		T.NodeSiteID = @SiteID AND T.NodeLevel = 0
	                            UNION ALL
	                            SELECT		T.NodeSiteID, T.NodeID,  T.NodeParentID, T.NodeOrder, T.DocumentGUID, T.DocumentName, T.ClassName, T.NodeAliasPath,
				                            CAST(CTE.DocumentNamePath + '/' + T.DocumentName AS VARCHAR(max)) AS DocumentGUIDPath,
				                            CAST(CTE.NodeIDPath + '/' + RIGHT('00000' + CAST(T.NodeID AS VARCHAR), 5) AS VARCHAR(max)) AS NodeIDPath,
				                            CAST(CTE.NodeOrderPath + '/' + RIGHT('00000' + CAST(T.NodeOrder AS VARCHAR), 5) AS VARCHAR(max)) AS NodeOrderPath,
				                            CAST(CTE.DocumentGUIDPath + '/' + CAST(T.DocumentGUID AS VARCHAR(36)) AS VARCHAR(max)) AS DocumentGUIDPath
	                            FROM		View_CMS_Tree_Joined T
	                            INNER JOIN	TreeCTE CTE ON 
				                            CTE.NodeID = T.NodeParentID
                                WHERE		T.NodeSiteID = @SiteID AND T.NodeParentID IS NOT NULL
                            )

                            SELECT		CTE.SiteID,
			                            C.ClassName, 
			                            C.ClassDisplayName, 
			                            T.[NodeID], 
			                            T.[NodeAliasPath], 
			                            T.[NodeName], 
			                            T.[NodeAlias], 
			                            T.[NodeClassID], 
			                            T.[NodeParentID], 
			                            T.[NodeSiteID], 
			                            T.[NodeGUID], 
			                            T.[NodeLevel],
			                            T.[NodeOrder], 
			                            T.[NodeLinkedNodeID], 
			                            D.[DocumentID], 
			                            D.[DocumentName], 
			                            D.[DocumentForeignKeyValue], 
			                            D.[DocumentPublishFrom], 
			                            D.[DocumentPublishTo], 
			                            D.[DocumentCulture], 
			                            D.[DocumentGUID],
			                            CTE.DocumentNamePath,
			                            CTE.NodeIDPath, 
			                            CTE.NodeOrderPath,
			                            CTE.DocumentGUIDPath,
			                            PTC.PageTemplateConfigurationName AS PageTemplateDisplayName,
                                        JSON_VALUE(IIF(d.DocumentPageTemplateConfiguration = '',NULL, d.DocumentPageTemplateConfiguration), '$.identifier') AS PageTemplateCodeName
                            FROM		dbo.CMS_Tree T 
                            INNER JOIN	dbo.CMS_Document D ON 
			                            T.NodeOriginalNodeID = D.DocumentNodeID 
                            INNER JOIN	dbo.CMS_Class C ON 
			                            T.NodeClassID = C.ClassID
                            INNER JOIN	TreeCTE CTE ON 
			                            T.NodeID = CTE.NodeID
                            LEFT OUTER JOIN CMS_PageTemplateConfiguration PTC ON 
                                        JSON_VALUE(IIF(d.DocumentPageTemplateConfiguration = '',NULL, d.DocumentPageTemplateConfiguration), '$.identifier') = JSON_VALUE(PTC.PageTemplateConfigurationTemplate, '$.identifier')

                            WHERE		T.NodeSiteID = @SiteID
                            ORDER BY	NodeOrderPath";

        QueryDataParameters qdp = new QueryDataParameters();
        qdp.Add(new DataParameter("SiteID", SiteContext.CurrentSiteID));

        QueryParameters qp = new QueryParameters(queryString, qdp, QueryTypeEnum.SQLQuery);
        DataSet ds = gc.ExecuteQuery(qp);

        var dt = new DataTable();
        if (ds.Tables.Count != 0 || ds.Tables[0].Rows.Count != 0)
            dt = ds.Tables[0];

        var clientKey = GetClientKey();
        var contentResponse = new ContentResponse(clientKey, cs.CacheItemName, dt);

        if (cs.Cached)
        {
            var cacheKeyList = new List<string>();
            cacheKeyList.Add($"node|{SiteContext.CurrentSiteName.ToLower()}|/|childnodes");
            cacheKeyList.Add("cms.class|all");
            cacheKeyList.Add("dummy|kenticoextensions");
            cacheKeyList.Add("dummy|" + cs.CacheItemName);
            cs.CacheDependency = CacheHelper.GetCacheDependency(cacheKeyList);
        }

        return contentResponse;
    }

    private void ProcessGetEndpoints()
    {
        var htmlOutput = new StringBuilder(1024);
        var baseURL = RequestContext.URL.GetLeftPart(UriPartial.Authority).Replace(":80", "") + "/kenticoextensions/api.ashx?";

        htmlOutput.Append("<style>");
        htmlOutput.Append(".endpoint-div { font-family: monospace; }");
        htmlOutput.Append(".endpoint-table { border-collapse: collapse; }");
        htmlOutput.Append(".endpoint-table th { text-align: left; border: 1px solid #999; padding: 4px; white-space:nowrap; }");
        htmlOutput.Append(".endpoint-table td { text-align: left; border: 1px solid #999; padding: 4px; white-space:nowrap; }");
        htmlOutput.Append("</style>");

        htmlOutput.Append("<div class='endpoint-div'>");

        htmlOutput.Append("<h2>Test Endpoints</h2>");
        htmlOutput.Append("<table class='endpoint-table'>");
        htmlOutput.Append("<thead><tr><th>Data Parmeter</th><th>Additional Parmeters</th><th>Endpoint Link</th></thead></tr>");
        htmlOutput.Append("<tbody>");
        htmlOutput.Append(getEnpointRow(baseURL, "test"));
        htmlOutput.Append(getEnpointRow(baseURL, "testerror"));
        htmlOutput.Append("</tbody>");
        htmlOutput.Append("</table>");

        htmlOutput.Append("<br/>");

        htmlOutput.Append("<h2>Data Endpoints</h2>");
        htmlOutput.Append("<table class='endpoint-table'>");
        htmlOutput.Append("<thead><tr><th>Data Parmeter</th><th>Additional Parmeters</th><th>Endpoint Link</th></thead></tr>");
        htmlOutput.Append("<tbody>");
        htmlOutput.Append(getEnpointRow(baseURL, "session"));
        htmlOutput.Append(getEnpointRow(baseURL, "configuration"));
        htmlOutput.Append(getEnpointRow(baseURL, "treeinfo"));
        htmlOutput.Append(getEnpointRow(baseURL, "documentinfo", "nodeid"));
        htmlOutput.Append(getEnpointRow(baseURL, "settingsbycategoryname", "categoryname, recursive"));
        htmlOutput.Append(getEnpointRow(baseURL, "shortcutbaritems"));
        htmlOutput.Append(getEnpointRow(baseURL, "userroles"));
        htmlOutput.Append(getEnpointRow(baseURL, "stagingtasks", "serverid"));
        htmlOutput.Append(getEnpointRow(baseURL, "stagingusers", "serverid"));
        htmlOutput.Append(getEnpointRow(baseURL, "mediafileinfo", "fileguid, width, height"));
        htmlOutput.Append(getEnpointRow(baseURL, "sites"));
        htmlOutput.Append(getEnpointRow(baseURL, "pagetypes"));
        htmlOutput.Append(getEnpointRow(baseURL, "customtables"));
        htmlOutput.Append(getEnpointRow(baseURL, "moduleclasses"));
        htmlOutput.Append(getEnpointRow(baseURL, "forms"));

        htmlOutput.Append(getEnpointRow(baseURL, "databasetables"));
        htmlOutput.Append(getEnpointRow(baseURL, "databasetableschema"));
        htmlOutput.Append(getEnpointRow(baseURL, "classschema"));
        htmlOutput.Append(getEnpointRow(baseURL, "settingkeys"));
        htmlOutput.Append(getEnpointRow(baseURL, "executequery"));
        htmlOutput.Append(getEnpointRow(baseURL, "mediafiles"));
        htmlOutput.Append(getEnpointRow(baseURL, "reports"));
        htmlOutput.Append(getEnpointRow(baseURL, "treedata"));
        htmlOutput.Append(getEnpointRow(baseURL, "stageobject", "objecttype, objectid"));


        htmlOutput.Append("</tbody>");
        htmlOutput.Append("</table>");

        htmlOutput.Append("<br/>");

        htmlOutput.Append("<h2>Other Endpoints</h2>");
        htmlOutput.Append("<table class='endpoint-table'>");
        htmlOutput.Append("<thead><tr><th>Data Parmeter</th><th>Additional Parmeters</th><th>Endpoint Link</th></thead></tr>");
        htmlOutput.Append("<tbody>");
        htmlOutput.Append(getEnpointRow(baseURL, "cachelist"));
        htmlOutput.Append(getEnpointRow(baseURL, "teapot"));
        htmlOutput.Append("</tbody>");
        htmlOutput.Append("</table>");

        htmlOutput.Append("<br/>");

        htmlOutput.Append("</div>");

        context.Response.ContentType = "text/html";
        context.Response.StatusCode = 200;
        context.Response.Status = context.Response.StatusCode + " " + context.Response.StatusDescription;
        context.Response.Write(htmlOutput.ToString());
    }

    private string getEnpointRow(string baseURL, string dataParam, string additionalParams = "")
    {
        var url = string.Format("{0}data={1}", baseURL, dataParam);
        return string.Format("<tr><td>{0}</td><td>{1}</td><td><a target='_blank' href='{2}'>{2}</a></td></tr>", dataParam, additionalParams, url);
    }

    private void UpdateCacheList(ContentResponse contentResponse)
    {
        var cacheItemName = string.Format("kenticoextensions|cachelist|{0}", Environment.MachineName);
        var cacheObject = CacheHelper.GetItem(cacheItemName, false);

        ContentResponse cacheListContentResponse = null;
        List<CacheStatus> cacheStatuses;
        CacheStatus cacheStatus;

        if (cacheObject != null)
            cacheListContentResponse = (ContentResponse)cacheObject;

        if (cacheListContentResponse != null && cacheListContentResponse.Data != null)
        {
            cacheStatuses = (List<CacheStatus>)cacheListContentResponse.Data;
            cacheStatus = cacheStatuses.Find(c => c.ServerKey == contentResponse.ServerKey);

            var newCacheStatus = new CacheStatus(contentResponse);
            if (cacheStatus == null)
            {
                cacheStatuses.Add(newCacheStatus);
            }
            else
            {
                if (cacheStatus.Hash == contentResponse.Hash)
                {
                    return;
                }
                else
                {
                    cacheStatuses.Remove(cacheStatus);
                    cacheStatuses.Add(newCacheStatus);
                }
            }
        }
        else
        {
            cacheStatus = new CacheStatus(contentResponse);
            cacheStatuses = new List<CacheStatus>();
            cacheStatuses.Add(cacheStatus);
            cacheListContentResponse = new ContentResponse("data=cachelist", cacheItemName, cacheStatuses);
        }

        CacheHelper.TouchKey($"dummy|{cacheItemName}");

        var cacheKeyList = new List<string>();
        cacheKeyList.Add("dummy|kenticoextensions");
        cacheKeyList.Add("dummy|" + cacheItemName);
        var cacheDependencies = CacheHelper.GetCacheDependency(cacheKeyList);

        CacheHelper.Add(cacheItemName, cacheListContentResponse, cacheDependencies, DateTime.Now.AddMinutes(60), new TimeSpan(0, 0, 0));
    }

    private void WriteResponse(int code, string message, bool outputHTML = false)
    {
        if (outputHTML)
            context.Response.ContentType = "text/html";
        else
            context.Response.ContentType = "text/plain";

        context.Response.StatusCode = code;
        switch (code)
        {
            case 304:
                context.Response.StatusDescription = "Not Modified";
                break;
            case 400:
                context.Response.StatusDescription = "Bad Request";
                break;
            case 403:
                context.Response.StatusDescription = "Forbidden";
                break;
            case 405:
                context.Response.StatusDescription = "Method Not Allowed";
                break;
            case 418:
                context.Response.StatusDescription = "I'm a teapot";
                break;
            case 500:
                context.Response.StatusDescription = "Internal Server Error";
                break;
        }
        context.Response.Status = context.Response.StatusCode + " " + context.Response.StatusDescription;
        responseBody = context.Response.Status + ": " + message;

        if (outputHTML)
            responseBody = "<div>" + responseBody + "</div>";

        context.Response.Write(responseBody);
    }

    private void WriteResponse(ContentResponse contentResponse)
    {
        if (ResourceNotModified(contentResponse))
            return;

        string responseJSON = JsonConvert.SerializeObject(contentResponse, Formatting.Indented);
        WriteJSONResponse(responseJSON);
    }

    private void WriteResponse(object responseObject)
    {
        string responseJSON = JsonConvert.SerializeObject(responseObject, Formatting.Indented);
        WriteJSONResponse(responseJSON);
    }

    private void WriteJSONResponse(string json)
    {

        context.Response.ContentType = "application/json";
        if (string.IsNullOrWhiteSpace(json))
        {
            context.Response.Write("[]");
            responseBody = "[]";
        }
        else
        {
            if (applyCompression)
                ApplyCompression();
            context.Response.Write(json);
            responseBody = json;
        }
    }

    private bool ResourceNotModified(ContentResponse contentResponse)
    {
        if (clientCache == false)
            return false;

        context.Response.Cache.SetCacheability(HttpCacheability.NoCache);
        context.Response.Cache.SetMaxAge(new TimeSpan(0, 60, 0));
        context.Response.Cache.SetETag(contentResponse.Hash);

        string requestTag = context.Request.Headers.Get("If-None-Match");
        if (string.IsNullOrEmpty(requestTag) == false && contentResponse.Hash == requestTag)
        {
            WriteResponse(304, "Resource has not been modified since last request.");
            return true;
        }

        return false;
    }


    public static void ApplyCompression()
    {
        string AcceptEncoding = HttpContext.Current.Request.Headers["Accept-Encoding"];
        if (string.IsNullOrEmpty(AcceptEncoding))
            return;

        HttpResponse Response = HttpContext.Current.Response;
        if (AcceptEncoding.Contains("gzip"))
        {
            Response.Filter = new GZipStream(Response.Filter, CompressionMode.Compress);
            Response.Headers.Remove("Content-Encoding");
            Response.AppendHeader("Content-Encoding", "gzip");
            return;
        }

        if (AcceptEncoding.Contains("deflate"))
        {
            Response.Filter = new DeflateStream(Response.Filter, CompressionMode.Compress);
            Response.Headers.Remove("Content-Encoding");
            Response.AppendHeader("Content-Encoding", "deflate");
            return;
        }
    }

    public bool IsReusable
    {
        get
        {
            return false;
        }
    }
}

namespace KenticoExtensions.Helpers
{
    public static class DataRowHelper
    {
        public static string GetValue(DataRow dr, string ColumnName)
        {
            if (dr[ColumnName] == null || dr[ColumnName] == DBNull.Value)
                return null;
            else
                return dr[ColumnName].ToString();
        }

        public static int? GetIntValue(DataRow dr, string ColumnName)
        {
            if (dr[ColumnName] == null || dr[ColumnName] == DBNull.Value)
                return null;
            else
                return (int)dr[ColumnName];
        }

        public static Guid? GetGuidValue(DataRow dr, string ColumnName)
        {
            if (dr[ColumnName] == null || dr[ColumnName] == DBNull.Value)
                return null;
            else
                return (Guid)dr[ColumnName];
        }
    }
}

namespace KenticoExtensions.Models
{
    public class ClassType
    {
        public ClassType(DataRow dr, string elementGUID)
        {
            ClassID = (int)dr["ClassID"];
            ClassGUID = (Guid)dr["ClassGUID"];
            DisplayName = dr["ClassDisplayName"].ToString();
            CodeName = dr["ClassName"].ToString();
            TableName = dr["ClassTableName"].ToString();
            ClassURL = String.Format("/CMSModules/AdminControls/Pages/UIPage.aspx?elementguid={0}&objectid={1}", elementGUID, ClassID);
            SiteIDs = DataRowHelper.GetValue(dr, "SiteIDs");
        }

        public int ClassID { get; set; }
        public Guid ClassGUID { get; set; }
        public string DisplayName { get; set; }
        public string CodeName { get; set; }
        public string TableName { get; set; }
        public string ClassURL { get; set; }
        public string SiteIDs { get; set; }
    }

    public class PageType : ClassType
    {
        public PageType(DataRow dr) : base(dr, "f1741808-fe24-4a0e-8111-a63d13559635")
        {
            InheritedClassID = DataRowHelper.GetIntValue(dr, "InheritedClassID");
            InheritedClassGUID = DataRowHelper.GetGuidValue(dr, "InheritedClassGUID");
            InheritedDisplayName = DataRowHelper.GetValue(dr, "InheritedClassDisplayName");
            InheritedCodeName = DataRowHelper.GetValue(dr, "InheritedClassName");
            InheritedTableName = DataRowHelper.GetValue(dr, "InheritedClassTableName");
            if (InheritedClassID != null)
                InheritedClassURL = String.Format("/CMSModules/AdminControls/Pages/UIPage.aspx?elementguid={0}&objectid={1}", "f1741808-fe24-4a0e-8111-a63d13559635", InheritedClassID);
        }

        public int? InheritedClassID { get; set; }
        public Guid? InheritedClassGUID { get; set; }
        public string InheritedDisplayName { get; set; }
        public string InheritedCodeName { get; set; }
        public string InheritedTableName { get; set; }
        public string InheritedClassURL { get; set; }
    }

    public class TreeItem
    {
        public TreeItem(DataRow dr)
        {
            NodeName = dr["NodeName"].ToString();
            NodeID = (int)dr["NodeID"];
            NodeGUID = (Guid)dr["NodeGUID"];
            NodeAliasPath = dr["NodeAliasPath"].ToString();
            DocumentID = (int)dr["DocumentID"];
            DocumentGUID = (Guid)dr["DocumentGUID"];
            ClassDisplayName = dr["ClassDisplayName"].ToString();
            ClassName = dr["ClassName"].ToString();
            PageTemplateDisplayName = dr["PageTemplateDisplayName"].ToString();
            PageTemplateCodeName = dr["PageTemplateCodeName"].ToString();
            AbsolutePath = string.Concat(SiteContext.CurrentSite.SitePresentationURL, dr["NodeAliasPath"].ToString());
        }

        public string NodeName { get; set; }
        public int NodeID { get; set; }
        public Guid NodeGUID { get; set; }
        public string NodeAliasPath { get; set; }
        public int DocumentID { get; set; }
        public Guid DocumentGUID { get; set; }
        public string ClassDisplayName { get; set; }
        public string ClassName { get; set; }
        public string PageTemplateDisplayName { get; set; }
        public string PageTemplateCodeName { get; set; }
        public string AbsolutePath { get; set; }
    }

    public class CacheStatus
    {
        public CacheStatus()
        { }

        public CacheStatus(ContentResponse contentResponse)
        {
            ClientKey = contentResponse.ClientKey;
            ServerKey = contentResponse.ServerKey;
            CacheDateTimeUTC = contentResponse.CacheDateTimeUTC;
            Hash = contentResponse.Hash;
        }

        [JsonProperty(Order = -2)]
        public string ClientKey { get; set; }
        [JsonProperty(Order = -2)]
        public string ServerKey { get; set; }
        [JsonProperty(Order = -2)]
        [JsonConverter(typeof(UTCJsonConverter))]
        public DateTime CacheDateTimeUTC { get; set; }
        [JsonProperty(Order = -2)]
        public string Hash { get; set; }
    }

    public class UTCJsonConverter : IsoDateTimeConverter
    {
        public UTCJsonConverter()
        {
            DateTimeFormat = "yyyy-MM-ddTHH:mm:ss.fffZ";
        }
    }

    public class ContentResponse : CacheStatus
    {
        public ContentResponse(string clientKey, string serverKey, object data)
        {
            ClientKey = clientKey;
            ServerKey = serverKey;
            if (data != null)
            {
                string dataJSON = JsonConvert.SerializeObject(data);
                if (string.IsNullOrEmpty(dataJSON))
                    dataJSON = string.Empty;
                Hash = GetMD5Hash(dataJSON);
            }
            else
                Hash = GetMD5Hash(string.Empty);

            CacheDateTimeUTC = DateTime.UtcNow;
            Data = data;
        }

        [JsonProperty(Order = -1)]
        public object Data { get; set; }

        private static string GetMD5Hash(string content)
        {
            var bytes = Encoding.UTF8.GetBytes(content);
            var result = new StringBuilder();
            using (var hashMethod = MD5.Create())
            {
                var hash = hashMethod.ComputeHash(bytes);
                for (int i = 0; i < hash.Length; i++)
                {
                    result.Append(hash[i].ToString("X2"));
                }
            }
            return result.ToString().ToLower();
        }
    }

    public class CustomSettingsCategory
    {
        public CustomSettingsCategory(SettingsCategoryInfo category)
        {
            if (category != null)
            {
                CategoryOrder = category.CategoryOrder;
                CategoryID = category.CategoryID;
                CategoryDisplayName = category.CategoryDisplayName;
                CategoryName = category.CategoryName;
            }
            Categories = new List<CustomSettingsCategory>();
            Keys = new List<CustomSettingsKey>();
        }

        public int CategoryOrder { get; set; }
        public int CategoryID { get; set; }
        public string CategoryDisplayName { get; set; }
        public string CategoryName { get; set; }

        public List<CustomSettingsKey> Keys { get; set; }
        public List<CustomSettingsCategory> Categories { get; set; }
    }

    public class CustomSettingsKey
    {
        public CustomSettingsKey(SettingsKeyInfo key)
        {

            KeyOrder = key.KeyOrder;
            KeyID = key.KeyID;
            KeyName = key.KeyName;
            KeyValue = key.KeyValue;
            KeyType = key.KeyType;
            KeyEditingControlPath = key.KeyEditingControlPath;
        }

        public int KeyOrder { get; set; }
        public int KeyID { get; set; }
        public string KeyName { get; set; }
        public string KeyValue { get; set; }
        public string KeyType { get; set; }
        public string KeyEditingControlPath { get; set; }
    }

    public class SettingsCategory
    {
        public string Name { get; set; }
        public List<SettingsCategory> Categories { get; set; }
        public List<Setting> Settings { get; set; }
    }

    public class Setting
    {
        public string Key { get; set; }
        public string Value { get; set; }
    }

    public enum IconColor
    {
        Green,
        Red,
        Orange,
        Blue,
        Grey,
        Purple,
        DarkBlue
    }

    public class ShortcutBarItem
    {
        public string name { get; set; }
        public string guid { get; set; }
        public string iconClass { get; set; }
        [JsonConverter(typeof(StringEnumConverter))]
        public IconColor iconColor { get; set; }
    }

    public class StagingTaskItem
    {
        public int TaskID { get; set; }
        public int TaskTitle { get; set; }
        public DateTime TaskTime { get; set; }
        public string UserIDList { get; set; }
        public string UserFullNameList { get; set; }
    }

    public class MediaFile
    {
        public MediaFile(MediaFileInfo mediaFileInfo)
        {
            GUID = mediaFileInfo.FileGUID;
            LibrayID = mediaFileInfo.FileLibraryID;
            Name = mediaFileInfo.FileName;
            Title = mediaFileInfo.FileTitle;
            Description = mediaFileInfo.FileDescription;
            Extension = mediaFileInfo.FileExtension;
            MimeType = mediaFileInfo.FileMimeType;
            FullPath = mediaFileInfo.FilePath;
            Size = mediaFileInfo.FileSize;
            Width = mediaFileInfo.FileImageWidth;
            Height = mediaFileInfo.FileImageHeight;
        }

        public Guid GUID { get; set; }
        public int LibrayID { get; set; }
        public string Name { get; set; }
        public string Title { get; set; }
        public string Description { get; set; }
        public string Extension { get; set; }
        public string MimeType { get; set; }
        public string FullPath { get; set; }
        public long Size { get; set; }
        public int Width { get; set; }
        public int Height { get; set; }
    }

    public class ExtensionsConfig
    {
        public ExtensionsConfig()
        {
            Extensions = new List<ExtensionConfig>();
        }

        public bool Enabled { get; set; }
        public bool ConsoleLogging { get; set; }
        public int CacheListRefreshFrequency { get; set; }
        public List<string> EnabledUserNames { get; set; }
        public List<string> DisabledUserNames { get; set; }
        public List<ExtensionConfig> Extensions { get; set; }
    }

    public class ExtensionConfig
    {
        public string Name { get; set; }
        public string Code { get; set; }
        public bool Enabled { get; set; }
        public bool ConsoleLogging { get; set; }
        [JsonProperty(NullValueHandling = NullValueHandling.Ignore)]
        public string ConfigPath { get; set; }
        [JsonProperty(NullValueHandling = NullValueHandling.Ignore)]
        public object Config { get; set; }
    }

    public class EnvironmentBarConfig : ExtensionConfig
    {
        public EnvironmentBarConfig()
        {
            Environments = new List<EnvironmentConfig>();
        }
        public List<EnvironmentConfig> Environments { get; set; }
    }

    public class EnvironmentConfig
    {
        public string URL { get; set; }
        public string Label { get; set; }
        public string Colour { get; set; }
    }

    public class SessionData
    {
        public string SessionID { get; set; }
        public string ASPNETFormsAuth { get; set; }
        public int UserID { get; set; }
        public Guid UserGUID { get; set; }
        public string UserName { get; set; }
        public bool GlobalAdmin { get; set; }
        public string PreferredUICultureCode { get; set; }
    }
}