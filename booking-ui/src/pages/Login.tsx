import React from 'react';
import { Form, Button, InputGroup } from 'react-bootstrap';
import {
  Link, Navigate
} from "react-router-dom";
import './Login.css';
import { Organization, AuthProvider, Ajax } from 'flexspace-commons';
import { withTranslation } from 'react-i18next';
import { TFunction } from 'i18next';
import RuntimeConfig from '../components/RuntimeConfig';
import { AuthContext } from '../AuthContextData';

interface State {
  email: string
  password: string
  rememberMe: boolean
  invalid: boolean
  redirect: string | null
  requirePassword: boolean
  providers: AuthProvider[] | null
}

interface Props {
  t: TFunction
}

class Login extends React.Component<Props, State> {
  static contextType = AuthContext;
  org: Organization | null;

  constructor(props: any) {
    super(props);
    this.org = null;
    this.state = {
      email: "",
      password: "",
      rememberMe: false,
      invalid: false,
      redirect: null,
      requirePassword: false,
      providers: null
    };
  }

  onSubmit = (e: any) => {
    e.preventDefault();
    let email = this.state.email.split("@");
    if (email.length !== 2) {
      // Error
      return;
    }
    let payload = {
      email: this.state.email
    };
    Ajax.postData("/auth/preflight", payload).then((res) => {
      this.org = new Organization();
      this.org.deserialize(res.json.organization);
      this.setState({
        providers: res.json.authProviders,
        requirePassword: res.json.requirePassword
      });
    }).catch(() => {
      this.setState({
        invalid: true
      });
    });
  }

  onPasswordSubmit = (e: any) => {
    e.preventDefault();
    let payload = {
      email: this.state.email,
      password: this.state.password,
      longLived: this.state.rememberMe
    };
    Ajax.postData("/auth/login", payload).then((res) => {
      Ajax.CREDENTIALS = {
        accessToken: res.json.accessToken,
        refreshToken: res.json.refreshToken,
        accessTokenExpiry: new Date(new Date().getTime() + Ajax.ACCESS_TOKEN_EXPIRY_OFFSET)
      };
      Ajax.PERSISTER.updateCredentialsSessionStorage(Ajax.CREDENTIALS).then(() => {
        if (this.state.rememberMe) {
          Ajax.PERSISTER.persistRefreshTokenInLocalStorage(Ajax.CREDENTIALS);
        }
        RuntimeConfig.setLoginDetails(this.context).then(() => {
          this.setState({
            redirect: "/search"
          });
        });
      });
    }).catch(() => {
      this.setState({
        invalid: true
      });
    });
  }

  cancelPasswordLogin = (e: any) => {
    e.preventDefault();
    this.setState({
      requirePassword: false,
      providers: null,
      invalid: false
    });
  }

  renderAuthProviderButton = (provider: AuthProvider) => {
    return (
      <p key={provider.id}>
        <Button variant="primary" className="btn-auth-provider" onClick={() => this.useProvider(provider)}>{provider.name}</Button>
      </p>
    );
  }

  useProvider = (provider: AuthProvider) => {
    let target = Ajax.getBackendUrl() + "/auth/" + provider.id + "/login/ui";
    if (this.state.rememberMe) {
      target += "/1"
    }
    window.location.href = target;
  }

  render() {
    if (this.state.redirect != null) {
      return <Navigate replace={true} to={this.state.redirect} />
    }
    if (Ajax.CREDENTIALS.accessToken) {
      return <Navigate replace={true} to="/search" />
    }

    if (this.state.requirePassword) {
      return (
        <div className="container-signin">
          <Form className="form-signin" onSubmit={this.onPasswordSubmit}>
            <img src="./seatsurfing.svg" alt="Seatsurfing" className="logo" />
            <p>{this.props.t("signinAsAt", { user: this.state.email, org: this.org?.name })}</p>
            <InputGroup>
              <Form.Control type="password" placeholder={this.props.t("password")} value={this.state.password} onChange={(e: any) => this.setState({ password: e.target.value, invalid: false })} required={true} isInvalid={this.state.invalid} minLength={8} autoFocus={true} />
              <Button variant="primary" type="submit">&#10148;</Button>
            </InputGroup>
            <Form.Control.Feedback type="invalid">{this.props.t("errorInvalidPassword")}</Form.Control.Feedback>
            <p className="margin-top-50"><Button variant="link" onClick={this.cancelPasswordLogin}>{this.props.t("back")}</Button></p>
          </Form>
        </div>
      );
    }

    if (this.state.providers != null) {
      let buttons = this.state.providers.map(provider => this.renderAuthProviderButton(provider));
      let providerSelection = <p>{this.props.t("signinAsAt", { user: this.state.email, org: this.org?.name })}</p>;
      if (buttons.length === 0) {
        providerSelection = <p>{this.props.t("errorNoAuthProviders")}</p>
      }
      return (
        <div className="container-signin">
          <Form className="form-signin">
            <img src="./seatsurfing.svg" alt="Seatsurfing" className="logo" />
            {providerSelection}
            {buttons}
            <p className="margin-top-50"><Button variant="link" onClick={() => this.setState({ providers: null })}>{this.props.t("back")}</Button></p>
          </Form>
        </div>
      );
    }

    return (
      <div className="container-signin">
        <Form className="form-signin" onSubmit={this.onSubmit}>
          <img src="./seatsurfing.svg" alt="Seatsurfing" className="logo" />
          <h3>{this.props.t("findYourPlace")}</h3>
          <InputGroup>
            <Form.Control type="email" placeholder={this.props.t("emailPlaceholder")} value={this.state.email} onChange={(e: any) => this.setState({ email: e.target.value, invalid: false })} required={true} isInvalid={this.state.invalid} autoFocus={true} />
            <Button variant="primary" type="submit">&#10148;</Button>
          </InputGroup>
          <Form.Control.Feedback type="invalid">{this.props.t("errorInvalidEmail")}</Form.Control.Feedback>
          <Form.Check type="checkbox" id="check-rememberme" label={this.props.t("rememberMe")} checked={this.state.rememberMe} onChange={(e: any) => this.setState({ rememberMe: e.target.checked })} />
          <p className="margin-top-50"><Link to="/resetpw">{this.props.t("forgotPassword")}</Link></p>
        </Form>
        <p className="copyright-footer">&copy; Seatsurfing &#183; Version {process.env.REACT_APP_PRODUCT_VERSION}</p>
      </div>
    );
  }
}

export default withTranslation()(Login as any);
