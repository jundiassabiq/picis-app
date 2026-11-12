import { Component, type ReactNode } from 'react';
import { Button } from './ui';
import { IconAlert } from './icons';

interface Props {
  children: ReactNode;
  resetKey?: string;
}

interface State {
  failed: boolean;
}

/**
 * Last line of defence for the data views: if rendering throws, the user gets a
 * readable message and a retry instead of a blank screen.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidUpdate(previous: Props) {
    if (previous.resetKey !== this.props.resetKey && this.state.failed) {
      this.setState({ failed: false });
    }
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <div className="page" style={{ paddingTop: 40 }}>
        <div className="card" role="alert">
          <div className="alert" style={{ marginBottom: 14 }}>
            <IconAlert size={16} />
            Terjadi masalah saat menampilkan data. Perubahan terakhir mungkin belum tersimpan.
          </div>
          <p className="lede" style={{ fontSize: 13 }}>
            Coba muat ulang halaman. Data tersimpan di perangkat ini, jadi tidak hilang karena
            kesalahan tampilan.
          </p>
          <div className="row" style={{ marginTop: 16 }}>
            <Button variant="primary" onClick={() => window.location.reload()}>
              Coba lagi
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
