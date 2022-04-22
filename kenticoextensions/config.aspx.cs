using CMS.Helpers;
using CMS.Membership;
using KenticoExtensions.ViewModels;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.IO;
using System.Web;
using System.Web.UI.WebControls;

public partial class kenticoextensionsconfig : System.Web.UI.Page
{
    public const string CONFIG_PATH = @"\App_Data\kenticoextensions\config\kenticoextensions.json";
    protected void Page_Load(object sender, EventArgs e)
    {
        var privilegeLevel = MembershipContext.AuthenticatedUser.SiteIndependentPrivilegeLevel;

        if (privilegeLevel != CMS.Base.UserPrivilegeLevelEnum.GlobalAdmin)
        {
            lblError.Text = "You must be authenticated as a Global Admin to modify Kentico Extensions configuration.";
            pnlError.Visible = true;
            pnlInfo.Visible = false;

            phHeaderButtons.Visible = false;
            phGeneralConfig.Visible = false;
            rptExtensionsConfig.Visible = false;
            return;
        }

        if (!IsPostBack)
        {
            pnlError.Visible = false;
            pnlInfo.Visible = false;
            LoadConfig();
        }
    }

    private void LoadConfig()
    {
        ExtensionsConfig config = new ExtensionsConfig();

        var configFilePath = HttpContext.Current.Server.MapPath("~") + CONFIG_PATH;
        if (File.Exists(configFilePath) == false)
            return;

        var configJSON = File.ReadAllText(configFilePath);
        config = JsonConvert.DeserializeObject<ExtensionsConfig>(configJSON);


        ke_enabled.Checked = config.Enabled;
        ke_consoleLogging.Checked = config.ConsoleLogging;
        ke_cacheListRefreshFrequency.Text = config.CacheListRefreshFrequency.ToString();
        ke_enabledUserNames.Text = JsonConvert.SerializeObject(config.EnabledUserNames ?? new List<string>(), Formatting.Indented);
        ke_disabledUserNames.Text = JsonConvert.SerializeObject(config.DisabledUserNames ?? new List<string>(), Formatting.Indented);

        foreach (var ext in config.Extensions)
        {
            if (string.IsNullOrEmpty(ext.ConfigPath) == false)
            {
                var fullConfigPath = HttpContext.Current.Server.MapPath("~") + ext.ConfigPath;
                if (File.Exists(fullConfigPath))
                {
                    ext.ConfigJSON = File.ReadAllText(fullConfigPath);
                }
            }
        }

        rptExtensionsConfig.DataSource = config.Extensions;
        rptExtensionsConfig.DataBind();
    }

    protected void btnSave_Click(object sender, EventArgs e)
    {
        var extensionsConfig = new ExtensionsConfig();
        extensionsConfig.Enabled = ke_enabled.Checked;
        extensionsConfig.ConsoleLogging = ke_consoleLogging.Checked;
        extensionsConfig.EnabledUserNames = GetStringList(ke_enabledUserNames.Text);
        extensionsConfig.DisabledUserNames = GetStringList(ke_disabledUserNames.Text);

        if (int.TryParse(ke_cacheListRefreshFrequency.Text, out int tempInt))
            extensionsConfig.CacheListRefreshFrequency = tempInt;

        foreach (RepeaterItem item in rptExtensionsConfig.Items)
        {
            var ext = new ExtensionConfig();
            ext.Name = (item.FindControl("hfName") as HiddenField).Value;
            ext.Code = (item.FindControl("hfCode") as HiddenField).Value;
            ext.Enabled = (item.FindControl("cbEnabled") as CheckBox).Checked;
            ext.ConsoleLogging = (item.FindControl("cbConsoleLogging") as CheckBox).Checked;
            ext.ConfigPath = (item.FindControl("hfConfigPath") as HiddenField).Value;
            if (string.IsNullOrEmpty(ext.ConfigPath))
                ext.ConfigPath = null;
            ext.ConfigJSON = (item.FindControl("txtConfigJSON") as TextBox).Text;

            if (ext.ConfigPath != null)
            {
                var extConfigFilePath = HttpContext.Current.Server.MapPath("~") + ext.ConfigPath;
                File.WriteAllText(extConfigFilePath, ext.ConfigJSON);
            }

            extensionsConfig.Extensions.Add(ext);
        }

        var configJSON = JsonConvert.SerializeObject(extensionsConfig, Formatting.Indented);
        var configFilePath = HttpContext.Current.Server.MapPath("~") + CONFIG_PATH;
        File.WriteAllText(configFilePath, configJSON);

        lblInfo.Text = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") + " Configuration Saved";
        pnlInfo.Visible = true;

        //clear the config cache
        CacheHelper.TouchKey("dummy|kenticoextensions|configuration");

        LoadConfig();
    }

    protected List<string> GetStringList(string inputValue)
    {
        List<string> stringList;
        try
        {
            stringList = JsonConvert.DeserializeObject<List<string>>(inputValue) ?? new List<string>();
        }
        catch (Exception)
        {
            stringList = new List<string>();
        }
        return stringList;
    }

    protected void btnRefresh_Click(object sender, EventArgs e)
    {
        lblInfo.Text = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") + " Refresh Complete";
        pnlInfo.Visible = true;

        LoadConfig();
    }

    protected void btnClearCache_Click(object sender, EventArgs e)
    {
        lblInfo.Text = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") + " Cache Cleared";
        pnlInfo.Visible = true;

        CacheHelper.TouchKey("dummy|kenticoextensions");
        LoadConfig();
    }
}


namespace KenticoExtensions.ViewModels
{
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

    [JsonObject(MemberSerialization.OptOut)]
    public class ExtensionConfig
    {
        public string Name { get; set; }
        public string Code { get; set; }
        public bool Enabled { get; set; }
        public bool ConsoleLogging { get; set; }

        [JsonProperty(NullValueHandling = NullValueHandling.Ignore)]
        public string ConfigPath { get; set; }

        [JsonIgnore]
        public string ConfigJSON { get; set; }
    }
}