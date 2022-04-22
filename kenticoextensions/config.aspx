<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="config.aspx.cs" Inherits="kenticoextensionsconfig" %>

<!DOCTYPE html>

<html xmlns="http://www.w3.org/1999/xhtml">
<head runat="server">
    <title>Kentico Extensions Configuration</title>
    <link href="kenticoextensions.css" rel="stylesheet" />
</head>
<body class="ke-config">
    <form id="ke_config_form" runat="server">

        <table class="ke-config-table header">
            <tr>
                <td class="col1">
                    <h2>Kentico Extensions Configuration</h2>
                </td>
                <td class="col2">
                    <asp:PlaceHolder ID="phHeaderButtons" runat="server">
                    <asp:Button ID="btnClearCache" runat="server" Text="Clear Cache" CssClass="input-button" OnClick="btnClearCache_Click" />
                        &nbsp;
                    <asp:Button ID="btnRefresh" runat="server" Text="Refresh" CssClass="input-button" OnClick="btnRefresh_Click" />
                        &nbsp;
                    <asp:Button ID="btnSave" runat="server" Text="Save" CssClass="input-button" OnClick="btnSave_Click" />
                    </asp:PlaceHolder>
                </td>
            </tr>
        </table>
        <br />

        <asp:Panel ID="pnlInfo" runat="server" CssClass="panel-info" Visible="false">
            <asp:Label ID="lblInfo" runat="server" Text="" CssClass="label-info"></asp:Label>            
        </asp:Panel>
        <asp:Panel ID="pnlError" runat="server" CssClass="panel-error" Visible="false">
            <asp:Label ID="lblError" runat="server" Text="" CssClass="label-error"></asp:Label>            
        </asp:Panel>
        <br />

        <asp:PlaceHolder ID="phGeneralConfig" runat="server">
        <table class="ke-config-table general">
            <thead>
                <tr>
                    <td colspan="2">General Configuration
                    </td>
                </tr>
            </thead>
            <tr>
                <td class="col1">Enabled</td>
                <td class="col2">
                    <asp:CheckBox ID="ke_enabled" runat="server" /></td>
            </tr>
            <tr>
                <td class="col1">Console Logging</td>
                <td class="col2">
                    <asp:CheckBox ID="ke_consoleLogging" runat="server" /></td>
            </tr>
            <tr style="<%# Eval("ConfigPath") == null ? "display:none": "" %>">
                <td class="col1">Cache List Refresh Frequency (s)</td>
                <td class="col2">
                    <asp:TextBox ID="ke_cacheListRefreshFrequency" runat="server"></asp:TextBox></td>
            </tr>
            <tr>
                <td class="col1">Enabled Usernames</td>
                <td class="col2">
                    <asp:TextBox ID="ke_enabledUserNames" runat="server" TextMode="MultiLine" CssClass="json-small" Text='<%# Eval("EnabledUserNames") %>'></asp:TextBox>
                </td>
            </tr>
            <tr>
                <td class="col1">Disabled Usernames</td>
                <td class="col2">
                    <asp:TextBox ID="ke_disabledUserNames" runat="server" TextMode="MultiLine" CssClass="json-small" Text='<%# Eval("DisabledUserNames") %>'></asp:TextBox>
                </td>
            </tr>
        </table>
        </asp:PlaceHolder>

        <asp:Repeater ID="rptExtensionsConfig" runat="server">
            <HeaderTemplate>
                <br />
                <h2>Extensions</h2>
            </HeaderTemplate>
            <ItemTemplate>
                <table class="ke-config-table extension">
                    <thead>
                        <tr>
                            <td colspan="2">
                                <%# Eval("Name") %> (<%# Eval("Code") %>)
                                <asp:HiddenField ID="hfName" runat="server" Value='<%# Eval("Name") %>' />
                                <asp:HiddenField ID="hfCode" runat="server" Value='<%# Eval("Code") %>' />
                            </td>
                        </tr>
                    </thead>
                    <tr>
                        <td class="col1">Enabled</td>
                        <td class="col2">
                            <asp:CheckBox ID="cbEnabled" runat="server" Checked='<%# Eval("Enabled") %>' />
                    </tr>
                    <tr>
                        <td class="col1">Console Logging</td>
                        <td class="col2">
                            <asp:CheckBox ID="cbConsoleLogging" runat="server" Checked='<%# Eval("ConsoleLogging") %>' />
                    </tr>
                    <tr style="<%# Eval("ConfigPath") == null ? "display:none": "" %>">
                        <td class="col1">Config Path</td>
                        <td class="col2">
                            <%# Eval("ConfigPath") %>
                            <asp:HiddenField ID="hfConfigPath" runat="server" Value='<%# Eval("ConfigPath") %>' />
                        </td>
                    </tr>
                    <tr style="<%# Eval("ConfigPath") == null ? "display:none": "" %>">
                        <td class="col1">Config</td>
                        <td class="col2">
                            <asp:TextBox ID="txtConfigJSON" runat="server" TextMode="MultiLine" CssClass="json" Text='<%# Eval("ConfigJSON") %>'></asp:TextBox>
                        </td>
                    </tr>
                </table>
                <br />
            </ItemTemplate>
            <FooterTemplate>
            </FooterTemplate>
        </asp:Repeater>

        <input id="extensionsConfigJSON" type="hidden" />

    </form>
</body>
<script type="text/javascript">
    document.addEventListener('DOMContentLoaded', function() {
        document.getElementById('btnClearCache').onclick = function () {
            localStorage.clear();
        };
    }, false);
   
    //# sourceURL=ke_embeddedScript.js
</script>
</html>