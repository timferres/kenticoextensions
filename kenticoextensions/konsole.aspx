<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="konsole.aspx.cs" Inherits="konsole" %>

<!DOCTYPE html>

<html xmlns="http://www.w3.org/1999/xhtml">
<head runat="server">
    <title>Kentico Extensions Konsole</title>
    <link rel="stylesheet" href="api.ashx?resource=stylesheet" />
    <script type="text/javascript" src="api.ashx?resource=javascript"></script>
</head>
<body class="ke-ko-body">

    <div id="ke-ko-banner" class="ke-ko-banner">
_________________________________________________
|   __                              __          |
|  |  | ___ ___  __   _ _____ ____ |  |  ____   |
|  |  |/  /  _ \|   \| |  ___|  _ \|  | | ___|  |
|  |     /| |_| | |\   |__  || |_| |  |_| _|    |
|  |__|\__\____/|_| \__|____|\____/|____|____|  |
|_______________________________________________|
Press F9 to <a href="#" onclick="ke_ko_show();return false;">show the Konsole</a>

    </div>
    <div id="konsole"></div>
</body>
</html>